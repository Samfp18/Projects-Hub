import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { VaultProvider, useVault } from "../VaultContext.jsx";
import { vaultApi } from "../../lib/vaultApi.js";
import * as crypto from "../../lib/vaultCrypto.js";

vi.mock("../../lib/vaultApi.js", () => ({
  vaultApi: {
    getKdfParams: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function Probe() {
  const { accessToken, user, vaultKey, isLocked, loginWithMasterPassword, unlock, logout } = useVault();
  return (
    <div>
      <span data-testid="token">{accessToken || "sem-token"}</span>
      <span data-testid="email">{user?.email || "sem-usuario"}</span>
      <span data-testid="vaultkey">{vaultKey ? "desbloqueado" : "trancado"}</span>
      <span data-testid="locked">{String(isLocked)}</span>
      <button onClick={() => loginWithMasterPassword("teste@example.com", "senha-mestra-123")}>login</button>
      <button onClick={() => unlock("senha-mestra-123")}>unlock</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

async function setupSuccessfulLoginMocks() {
  const realVaultKey = await crypto.generateVaultKey();
  const encryptionKey = await crypto.deriveEncryptionKey(await crypto.deriveMasterKeyBits("senha-mestra-123", "c2FsdHNhbHRzYWx0c2FsdA==", 100000));
  const wrappedVaultKey = await crypto.wrapVaultKey(realVaultKey, encryptionKey);

  vaultApi.getKdfParams.mockResolvedValue({ kdfSalt: "c2FsdHNhbHRzYWx0c2FsdA==", kdfIterations: 100000 });
  vaultApi.login.mockResolvedValue({
    accessToken: "access-abc",
    refreshToken: "refresh-def",
    wrappedVaultKey,
  });
  vaultApi.me.mockResolvedValue({ email: "teste@example.com", totpEnabled: false });
}

describe("VaultProvider — estado inicial", () => {
  it("começa trancado, sem token e sem usuário", () => {
    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>
    );
    expect(screen.getByTestId("token").textContent).toBe("sem-token");
    expect(screen.getByTestId("vaultkey").textContent).toBe("trancado");
    expect(screen.getByTestId("locked").textContent).toBe("true");
  });
});

describe("loginWithMasterPassword", () => {
  it("login bem-sucedido desembrulha a vaultKey e desbloqueia", async () => {
    await setupSuccessfulLoginMocks();

    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("login"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("token").textContent).toBe("access-abc");
      expect(screen.getByTestId("vaultkey").textContent).toBe("desbloqueado");
      expect(screen.getByTestId("locked").textContent).toBe("false");
    });
  });

  it("quando o servidor exige 2FA, NÃO desbloqueia o cofre", async () => {
    vaultApi.getKdfParams.mockResolvedValue({ kdfSalt: "c2FsdHNhbHRzYWx0c2FsdA==", kdfIterations: 100000 });
    vaultApi.login.mockResolvedValue({ totpRequired: true });

    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("login"));
    });

    expect(vaultApi.me).not.toHaveBeenCalled();
    expect(screen.getByTestId("vaultkey").textContent).toBe("trancado");
  });
});

describe("logout", () => {
  it("limpa token, usuário e tranca o cofre", async () => {
    await setupSuccessfulLoginMocks();
    vaultApi.logout.mockResolvedValue({ message: "ok" });

    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("login"));
    });
    await waitFor(() => expect(screen.getByTestId("vaultkey").textContent).toBe("desbloqueado"));

    await act(async () => {
      fireEvent.click(screen.getByText("logout"));
    });

    expect(vaultApi.logout).toHaveBeenCalledWith("refresh-def");
    expect(screen.getByTestId("token").textContent).toBe("sem-token");
    expect(screen.getByTestId("vaultkey").textContent).toBe("trancado");
  });
});

describe("auto-bloqueio por inatividade", () => {
  it("tranca o cofre sozinho depois do tempo limite sem interação", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await setupSuccessfulLoginMocks();

    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("login"));
    });
    await waitFor(() => expect(screen.getByTestId("vaultkey").textContent).toBe("desbloqueado"));

    await act(async () => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    });

    expect(screen.getByTestId("vaultkey").textContent).toBe("trancado");
    // A sessão (token) continua ativa — só o cofre trancou, não deslogou.
    expect(screen.getByTestId("token").textContent).toBe("access-abc");
  });

  it("interação do usuário reinicia o temporizador de inatividade", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await setupSuccessfulLoginMocks();

    render(
      <VaultProvider>
        <Probe />
      </VaultProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("login"));
    });
    await waitFor(() => expect(screen.getByTestId("vaultkey").textContent).toBe("desbloqueado"));

    // Passa 4 minutos (menos que o limite de 5), simula interação, depois
    // mais 4 minutos — nunca deveria trancar, porque a interação reiniciou
    // a contagem antes de completar os 5 minutos.
    await act(async () => {
      vi.advanceTimersByTime(4 * 60 * 1000);
    });
    fireEvent.mouseDown(window);
    await act(async () => {
      vi.advanceTimersByTime(4 * 60 * 1000);
    });

    expect(screen.getByTestId("vaultkey").textContent).toBe("desbloqueado");
  });
});
