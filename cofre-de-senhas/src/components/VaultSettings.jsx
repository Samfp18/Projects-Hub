import { useState } from "react";
import { useVault } from "../context/VaultContext";
import { vaultApi } from "../lib/vaultApi";
import {
  generateSaltBase64,
  deriveMasterKeyBits,
  deriveEncryptionKey,
  deriveAuthProof,
  wrapVaultKey,
  PBKDF2_ITERATIONS_DEFAULT,
} from "../lib/vaultCrypto";

export default function Settings({ onClose }) {
  const { accessToken, user, vaultKey } = useVault();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [totpSecret, setTotpSecret] = useState(null);
  const [totpCode, setTotpCode] = useState("");

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("As senhas novas não coincidem.");
      return;
    }
    if (newPassword.length < 12) {
      setError("A nova senha mestra precisa ter pelo menos 12 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { kdfSalt, kdfIterations } = await vaultApi.getKdfParams(user.email);
      const currentMasterKeyBits = await deriveMasterKeyBits(currentPassword, kdfSalt, kdfIterations);
      const currentLoginProbe = await deriveAuthProof(currentMasterKeyBits);
      // Verifica a senha atual sem emitir nenhum token — se estiver
      // errada, isso lança erro antes de mudar qualquer coisa.
      await vaultApi.verifyCurrentPassword(accessToken, currentLoginProbe);

      const newSalt = generateSaltBase64();
      const newIterations = PBKDF2_ITERATIONS_DEFAULT;
      const newMasterKeyBits = await deriveMasterKeyBits(newPassword, newSalt, newIterations);
      const newEncryptionKey = await deriveEncryptionKey(newMasterKeyBits);
      const newAuthProof = await deriveAuthProof(newMasterKeyBits);

      // Re-embrulha a MESMA vaultKey (já desbloqueada em memória) com a
      // chave nova — os itens do cofre não são tocados, só a "capa" que
      // protege a chave deles.
      const newWrappedVaultKey = await wrapVaultKey(vaultKey, newEncryptionKey);

      await vaultApi.changeMasterPassword(accessToken, {
        newAuthProof,
        newKdfSalt: newSalt,
        newKdfIterations: newIterations,
        newWrappedVaultKey,
      });

      setMessage("Senha mestra alterada. Você precisará entrar novamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Senha atual incorreta, ou houve uma falha ao alterar. Nada foi modificado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart2fa() {
    const result = await vaultApi.setup2fa(accessToken);
    setQrCode(result.qrCode);
    setTotpSecret(result.secret);
  }

  async function handleVerify2fa(e) {
    e.preventDefault();
    setError("");
    try {
      await vaultApi.verify2fa(accessToken, totpCode);
      setMessage("2FA ativado com sucesso.");
      setQrCode(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-2xl font-semibold text-paper">Configurações</h2>
        <button type="button" onClick={onClose} className="font-body text-sm text-paper-dim hover:text-paper">
          Voltar ao cofre
        </button>
      </div>

      <div className="bg-panel rounded-2xl border border-hairline p-6">
        <h3 className="font-mono text-lg font-semibold text-paper mb-1">Trocar senha mestra</h3>
        <p className="font-body text-xs text-paper-dim mb-4">
          Isso reembrulha a chave do seu cofre — os itens não precisam ser recriptografados um por um.
        </p>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            required
            placeholder="Senha mestra atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
          />
          <input
            type="password"
            required
            minLength={12}
            placeholder="Nova senha mestra"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
          />
          <input
            type="password"
            required
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-hazard text-ink font-mono font-semibold py-3 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
          >
            {loading ? "Alterando…" : "Alterar senha mestra"}
          </button>
        </form>
      </div>

      <div className="bg-panel rounded-2xl border border-hairline p-6">
        <h3 className="font-mono text-lg font-semibold text-paper mb-1">Autenticação em duas etapas</h3>
        <p className="font-body text-xs text-paper-dim mb-4">
          Protege o login com um código adicional do seu app autenticador.
        </p>
        {user?.totpEnabled ? (
          <p className="font-body text-sm text-safe">✓ Já ativado.</p>
        ) : qrCode ? (
          <form onSubmit={handleVerify2fa} className="flex flex-col gap-3 items-center">
            <div className="bg-paper rounded-lg p-4">
              <img src={qrCode} alt="QR code para 2FA" width={180} height={180} />
            </div>
            <details className="font-mono text-xs text-paper-dim">
              <summary className="cursor-pointer">Inserir manualmente</summary>
              <code className="block mt-2">{totpSecret}</code>
            </details>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="bg-ink border border-hazard rounded-lg px-4 py-3 text-paper font-mono text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-hazard"
            />
            <button
              type="submit"
              className="bg-hazard text-ink font-mono font-semibold py-3 px-6 rounded-full hover:brightness-110 transition-all"
            >
              Confirmar e ativar
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleStart2fa}
            className="bg-hazard text-ink font-mono font-semibold py-3 px-6 rounded-full hover:brightness-110 transition-all"
          >
            Ativar 2FA
          </button>
        )}
      </div>

      {message && <p className="font-body text-sm text-safe">{message}</p>}
      {error && <p className="font-body text-sm text-danger">{error}</p>}
    </div>
  );
}
