// Todo evento de segurança relevante passa por aqui. NUNCA logamos senha,
// token, ou segredo de 2FA — só o tipo de evento, o e-mail (para
// investigação de conta específica) e um hash do IP (mesma lógica de
// privacidade do Cofre de Senhas: suficiente para detectar padrões,
// insuficiente para vigilância).

export const AUDIT_EVENTS = {
  REGISTER: "register",
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  ACCOUNT_LOCKED: "account_locked",
  TOTP_ENABLED: "totp_enabled",
  TOTP_FAILED: "totp_failed",
  TOKEN_REFRESHED: "token_refreshed",
  REFRESH_TOKEN_REUSE_DETECTED: "refresh_token_reuse_detected",
  LOGOUT: "logout",
  MASTER_PASSWORD_CHANGED: "master_password_changed",
  VAULT_EXPORTED: "vault_exported",
};

export function createAuditLogger(db) {
  const insert = db.prepare(
    `INSERT INTO audit_log (user_id, email, event, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)`
  );

  return {
    log({ userId = null, email = null, event, ipHash = null }) {
      insert.run(userId, email, event, ipHash, Date.now());
    },

    getForUser(userId, limit = 50) {
      return db
        .prepare(`SELECT event, created_at FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
        .all(userId, limit);
    },
  };
}
