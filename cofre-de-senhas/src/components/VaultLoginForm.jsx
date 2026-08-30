import { useState } from "react";
import { useVault } from "../context/VaultContext";

export default function LoginForm({ onSwitchToRegister }) {
  const { loginWithMasterPassword } = useVault();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginWithMasterPassword(email, masterPassword, needsTotp ? totpCode : undefined);
      if (result.totpRequired) {
        setNeedsTotp(true);
      }
    } catch (err) {
      if (err.status === 423) {
        setError("Conta temporariamente bloqueada por excesso de tentativas.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-panel rounded-2xl border border-hairline p-6 md:p-8 flex flex-col gap-5">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-hazard mb-2 uppercase">Acesso ao cofre</p>
        <h2 className="font-mono text-2xl font-semibold text-paper">Entrar</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={needsTotp}
            autoComplete="email"
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
            Senha mestra
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            disabled={needsTotp}
            autoComplete="current-password"
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard disabled:opacity-60"
          />
        </div>

        {needsTotp && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-totp" className="font-mono text-xs text-hazard uppercase tracking-wider">
              Código do autenticador
            </label>
            <input
              id="login-totp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="bg-ink border border-hazard rounded-lg px-4 py-3 text-paper font-mono text-lg tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-hazard"
            />
          </div>
        )}

        {error && <p className="font-body text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-hazard text-ink font-mono font-semibold py-3 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
        >
          {loading ? "Abrindo…" : needsTotp ? "Confirmar" : "Entrar"}
        </button>
      </form>

      <p className="font-body text-sm text-paper-dim text-center">
        Ainda não tem cofre?{" "}
        <button type="button" onClick={onSwitchToRegister} className="text-hazard hover:underline">
          Criar um
        </button>
      </p>
    </div>
  );
}
