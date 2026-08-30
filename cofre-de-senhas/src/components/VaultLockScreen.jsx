import { useState } from "react";
import { useVault } from "../context/VaultContext";
import VaultDial from "./VaultDial";

export default function LockScreen() {
  const { user, unlock, logout } = useVault();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await unlock(masterPassword);
    } catch (err) {
      setError(err.message || "Senha mestra incorreta.");
    } finally {
      setLoading(false);
      setMasterPassword("");
    }
  }

  return (
    <div className="bg-panel rounded-2xl border border-hairline p-6 md:p-8 flex flex-col gap-5 items-center text-center">
      <VaultDial locked size={56} />
      <div>
        <h2 className="font-mono text-2xl font-semibold text-paper">Cofre trancado</h2>
        <p className="font-body text-sm text-paper-dim mt-1">
          Trancado por inatividade. Digite sua senha mestra para continuar, {user?.email}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="password"
          required
          autoFocus
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          placeholder="Senha mestra"
          className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper text-center focus:outline-none focus:ring-2 focus:ring-hazard"
        />

        {error && <p className="font-body text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-hazard text-ink font-mono font-semibold py-3 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
        >
          {loading ? "Abrindo…" : "Destrancar"}
        </button>

        <button type="button" onClick={logout} className="font-body text-sm text-paper-dim hover:text-paper">
          Sair da conta
        </button>
      </form>
    </div>
  );
}
