import { useState } from "react";
import { useVault } from "../context/VaultContext";
import { analyzePassword } from "../lib/analyze";

export default function RegisterForm({ onSwitchToLogin }) {
  const { register } = useVault();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [strength, setStrength] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(value) {
    setMasterPassword(value);
    if (value) {
      const result = await analyzePassword(value);
      setStrength(result);
    } else {
      setStrength(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (masterPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (masterPassword.length < 12) {
      setError("A senha mestra precisa ter pelo menos 12 caracteres — ela protege tudo o mais.");
      return;
    }

    setLoading(true);
    try {
      await register(email, masterPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-panel rounded-2xl border border-hairline p-6 md:p-8 flex flex-col gap-4 items-center text-center">
        <h2 className="font-mono text-2xl font-semibold text-paper">Cofre criado</h2>
        <p className="font-body text-sm text-paper-dim">
          Guarde bem sua senha mestra — ela nunca é enviada nem armazenada em lugar nenhum. Se você esquecê-la,
          não existe forma de recuperar o conteúdo do seu cofre.
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="mt-2 bg-hazard text-ink font-mono font-semibold py-3 px-6 rounded-full hover:brightness-110 transition-all"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-panel rounded-2xl border border-hairline p-6 md:p-8 flex flex-col gap-5">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-hazard mb-2 uppercase">Novo cofre</p>
        <h2 className="font-mono text-2xl font-semibold text-paper">Criar seu cofre pessoal</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-email" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
            E-mail
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-password" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
            Senha mestra (mínimo 12 caracteres)
          </label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={12}
            value={masterPassword}
            onChange={(e) => handlePasswordChange(e.target.value)}
            autoComplete="new-password"
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
          />
          {strength && (
            <p className="font-mono text-xs text-paper-dim">
              Força: <span className="text-hazard">{strength.label}</span> · quebra em {strength.crackTime}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-confirm" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
            Confirmar senha mestra
          </label>
          <input
            id="reg-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
          />
        </div>

        <p className="font-body text-xs text-paper-dim">
          Sua senha mestra nunca sai deste navegador — nem em texto puro, nem de nenhuma outra forma. Não existe
          "esqueci minha senha" aqui: se você perdê-la, o conteúdo do cofre é irrecuperável, de propósito.
        </p>

        {error && <p className="font-body text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-hazard text-ink font-mono font-semibold py-3 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
        >
          {loading ? "Criando…" : "Criar cofre"}
        </button>
      </form>

      <p className="font-body text-sm text-paper-dim text-center">
        Já tem um cofre?{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-hazard hover:underline">
          Entrar
        </button>
      </p>
    </div>
  );
}
