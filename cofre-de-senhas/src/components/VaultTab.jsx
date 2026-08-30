import { useState } from "react";
import { useVault } from "../context/VaultContext";
import VaultRegisterForm from "./VaultRegisterForm";
import VaultLoginForm from "./VaultLoginForm";
import VaultLockScreen from "./VaultLockScreen";
import VaultList from "./VaultList";
import VaultSettings from "./VaultSettings";

export default function VaultTab() {
  const { accessToken, isLocked, logout } = useVault();
  const [screen, setScreen] = useState("login"); // login | register
  const [showSettings, setShowSettings] = useState(false);

  if (!accessToken) {
    return screen === "login" ? (
      <VaultLoginForm onSwitchToRegister={() => setScreen("register")} />
    ) : (
      <VaultRegisterForm onSwitchToLogin={() => setScreen("login")} />
    );
  }

  if (isLocked) {
    return <VaultLockScreen />;
  }

  if (showSettings) {
    return <VaultSettings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="font-mono text-xs uppercase tracking-wider text-paper-dim hover:text-paper"
        >
          configurações
        </button>
        <button
          type="button"
          onClick={logout}
          className="font-mono text-xs uppercase tracking-wider text-paper-dim hover:text-paper"
        >
          sair do cofre
        </button>
      </div>
      <VaultList />
    </div>
  );
}
