import { Router } from "express";
import crypto from "node:crypto";
import { hashIp } from "../utils/hashIp.js";
import { hashAuthProof, verifyAuthProof } from "../services/authProof.js";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../services/vaultTokens.js";
import { createTotpSecret, generateQrCodeDataUrl, verifyTotpCode } from "../services/totp.js";
import { computeLockout, isLocked } from "../services/bruteForce.js";
import { AUDIT_EVENTS } from "../services/vaultAuditLog.js";
import { requireAuth } from "../middleware/requireVaultAuth.js";
import {
  registerSchema,
  loginSchema,
  totpVerifySchema,
  refreshSchema,
  changeMasterPasswordSchema,
} from "../utils/vaultValidation.js";

export function createAuthRouter({ db, auditLogger }) {
  const router = Router();

  const getUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
  const getUserById = db.prepare("SELECT * FROM users WHERE id = ?");
  const insertUser = db.prepare(
    `INSERT INTO users (email, auth_hash, kdf_salt, kdf_iterations, wrapped_vault_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const updateFailedAttempts = db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?");
  const resetFailedAttempts = db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?");
  const setTotpSecret = db.prepare("UPDATE users SET totp_secret = ? WHERE id = ?");
  const enableTotp = db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?");
  const updateMasterPasswordMaterial = db.prepare(
    `UPDATE users SET auth_hash = ?, kdf_salt = ?, kdf_iterations = ?, wrapped_vault_key = ? WHERE id = ?`
  );

  const insertRefreshToken = db.prepare(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)"
  );
  const getRefreshToken = db.prepare("SELECT * FROM refresh_tokens WHERE token_hash = ?");
  const revokeRefreshToken = db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?");
  const revokeAllUserTokens = db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?");

  router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, authProof, kdfSalt, kdfIterations, wrappedVaultKey } = parsed.data;

    if (getUserByEmail.get(email)) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }

    const authHash = await hashAuthProof(authProof);
    const result = insertUser.run(email, authHash, kdfSalt, kdfIterations, wrappedVaultKey, Date.now());

    auditLogger.log({
      userId: result.lastInsertRowid,
      email,
      event: AUDIT_EVENTS.REGISTER,
      ipHash: hashIp(req.ip),
    });

    res.status(201).json({ message: "Conta criada com sucesso." });
  });

  const getKdfParamsStmt = db.prepare("SELECT kdf_salt, kdf_iterations FROM users WHERE email = ?");

  // Rota PÚBLICA (sem autenticação): devolve os parâmetros de derivação
  // de chave para um e-mail, ANTES do login. Isso é necessário porque o
  // navegador precisa do salt/iterações reais do usuário para calcular o
  // authProof correto — sem isso, seria impossível saber com quais
  // parâmetros derivar a chave antes de ter feito login. É o mesmo
  // padrão usado por gerenciadores de senha reais (Bitwarden expõe algo
  // equivalente). Isso NÃO vaza a senha nem a chave — só os parâmetros
  // públicos de derivação, que sozinhos não servem para nada sem a senha
  // mestra em si.
  //
  // Para não confirmar/negar a existência de uma conta por essa rota
  // (evitar enumeração de e-mails), devolvemos parâmetros "plausíveis
  // porém falsos" (salt determinístico a partir do e-mail, iterações
  // padrão) quando o e-mail não existe — o login vai falhar de qualquer
  // forma depois, sem revelar aqui se a conta existe.
  router.get("/kdf-params", (req, res) => {
    const email = String(req.query.email || "");
    const user = getUserByEmail.get(email);

    if (user) {
      return res.json({ kdfSalt: user.kdf_salt, kdfIterations: user.kdf_iterations });
    }

    const fakeSalt = crypto.createHash("sha256").update(email).digest("base64").slice(0, 22);
    res.json({ kdfSalt: fakeSalt, kdfIterations: 600000 });
  });

  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, authProof, totpCode } = parsed.data;

    const user = getUserByEmail.get(email);
    const genericError = () => res.status(401).json({ error: "E-mail ou senha mestra inválidos." });

    if (!user) {
      auditLogger.log({ email, event: AUDIT_EVENTS.LOGIN_FAILED, ipHash: hashIp(req.ip) });
      return genericError();
    }

    if (isLocked(user.locked_until)) {
      auditLogger.log({ userId: user.id, email, event: AUDIT_EVENTS.ACCOUNT_LOCKED, ipHash: hashIp(req.ip) });
      return res.status(423).json({ error: "Conta temporariamente bloqueada por excesso de tentativas." });
    }

    const authOk = await verifyAuthProof(authProof, user.auth_hash);
    if (!authOk) {
      const failedAttempts = user.failed_attempts + 1;
      const lockedUntil = computeLockout(failedAttempts);
      updateFailedAttempts.run(failedAttempts, lockedUntil, user.id);
      auditLogger.log({ userId: user.id, email, event: AUDIT_EVENTS.LOGIN_FAILED, ipHash: hashIp(req.ip) });
      return genericError();
    }

    if (user.totp_enabled) {
      if (!totpCode) {
        return res.status(200).json({ totpRequired: true });
      }
      const totpOk = await verifyTotpCode(user.totp_secret, totpCode);
      if (!totpOk) {
        auditLogger.log({ userId: user.id, email, event: AUDIT_EVENTS.TOTP_FAILED, ipHash: hashIp(req.ip) });
        return res.status(401).json({ error: "Código de autenticação inválido." });
      }
    }

    resetFailedAttempts.run(user.id);

    const accessToken = signAccessToken(user.id);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();
    insertRefreshToken.run(user.id, tokenHash, expiresAt, Date.now());

    auditLogger.log({ userId: user.id, email, event: AUDIT_EVENTS.LOGIN_SUCCESS, ipHash: hashIp(req.ip) });

    res.json({
      accessToken,
      refreshToken,
      kdfSalt: user.kdf_salt,
      kdfIterations: user.kdf_iterations,
      wrappedVaultKey: user.wrapped_vault_key,
    });
  });

  router.post("/refresh", (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { refreshToken } = parsed.data;
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = getRefreshToken.get(tokenHash);

    if (!stored || stored.revoked || stored.expires_at < Date.now()) {
      if (stored && stored.revoked) {
        auditLogger.log({
          userId: stored.user_id,
          event: AUDIT_EVENTS.REFRESH_TOKEN_REUSE_DETECTED,
          ipHash: hashIp(req.ip),
        });
        revokeAllUserTokens.run(stored.user_id);
      }
      return res.status(401).json({ error: "Refresh token inválido, expirado ou já utilizado." });
    }

    revokeRefreshToken.run(stored.id);
    const accessToken = signAccessToken(stored.user_id);
    const { token: newRefreshToken, tokenHash: newHash, expiresAt } = generateRefreshToken();
    insertRefreshToken.run(stored.user_id, newHash, expiresAt, Date.now());

    auditLogger.log({ userId: stored.user_id, event: AUDIT_EVENTS.TOKEN_REFRESHED, ipHash: hashIp(req.ip) });

    res.json({ accessToken, refreshToken: newRefreshToken });
  });

  router.post("/logout", (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      const tokenHash = hashRefreshToken(parsed.data.refreshToken);
      const stored = getRefreshToken.get(tokenHash);
      if (stored) {
        revokeRefreshToken.run(stored.id);
        auditLogger.log({ userId: stored.user_id, event: AUDIT_EVENTS.LOGOUT, ipHash: hashIp(req.ip) });
      }
    }
    res.json({ message: "Sessão encerrada." });
  });

  router.get("/me", requireAuth, (req, res) => {
    const user = getUserById.get(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ id: user.id, email: user.email, totpEnabled: Boolean(user.totp_enabled) });
  });

  router.post("/2fa/setup", requireAuth, async (req, res) => {
    const user = getUserById.get(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const secret = createTotpSecret();
    setTotpSecret.run(secret, user.id);
    const qrCode = await generateQrCodeDataUrl(secret, user.email);

    res.json({ qrCode, secret });
  });

  router.post("/2fa/verify", requireAuth, async (req, res) => {
    const parsed = totpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const user = getUserById.get(req.userId);
    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: "Configure o 2FA antes de verificar." });
    }

    const valid = await verifyTotpCode(user.totp_secret, parsed.data.code);
    if (!valid) {
      auditLogger.log({ userId: user.id, email: user.email, event: AUDIT_EVENTS.TOTP_FAILED, ipHash: hashIp(req.ip) });
      return res.status(401).json({ error: "Código inválido." });
    }

    enableTotp.run(user.id);
    auditLogger.log({ userId: user.id, email: user.email, event: AUDIT_EVENTS.TOTP_ENABLED, ipHash: hashIp(req.ip) });

    res.json({ message: "2FA ativado com sucesso." });
  });

  // Verifica a senha mestra ATUAL sem nunca emitir token nenhum — usado
  // pela tela de troca de senha mestra para confirmar que a pessoa sabe
  // a senha antiga antes de prosseguir. Antes desta rota existir, essa
  // verificação era feita chamando /login "só para checar", o que emitia
  // um refresh token de verdade a cada troca de senha — token que nunca
  // era usado nem revogado, ficando parado e válido no banco por 7 dias
  // à toa. Esta rota resolve isso checando o authProof diretamente,
  // sem tocar na tabela de refresh_tokens.
  router.post("/verify-current-password", requireAuth, async (req, res) => {
    const parsed = loginSchema.pick({ authProof: true }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const user = getUserById.get(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const valid = await verifyAuthProof(parsed.data.authProof, user.auth_hash);
    if (!valid) {
      return res.status(401).json({ error: "Senha mestra atual incorreta." });
    }
    res.json({ valid: true });
  });

  router.post("/change-master-password", requireAuth, async (req, res) => {
    const parsed = changeMasterPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const user = getUserById.get(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const { newAuthProof, newKdfSalt, newKdfIterations, newWrappedVaultKey } = parsed.data;
    const newAuthHash = await hashAuthProof(newAuthProof);

    updateMasterPasswordMaterial.run(newAuthHash, newKdfSalt, newKdfIterations, newWrappedVaultKey, user.id);
    revokeAllUserTokens.run(user.id);

    auditLogger.log({
      userId: user.id,
      email: user.email,
      event: AUDIT_EVENTS.MASTER_PASSWORD_CHANGED,
      ipHash: hashIp(req.ip),
    });

    res.json({ message: "Senha mestra alterada. Faça login novamente." });
  });

  return router;
}
