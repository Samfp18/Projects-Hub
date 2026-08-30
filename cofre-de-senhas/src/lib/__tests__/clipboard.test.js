import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyWithAutoClear, CLEAR_DELAY_MS } from "../clipboard.js";

function mockClipboard(initial = "") {
  let contents = initial;
  const clipboard = {
    writeText: vi.fn(async (text) => {
      contents = text;
    }),
    readText: vi.fn(async () => contents),
  };
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  return clipboard;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("copyWithAutoClear", () => {
  it("copia o valor para o clipboard imediatamente", async () => {
    const clipboard = mockClipboard();
    await copyWithAutoClear("senha-secreta");
    expect(clipboard.writeText).toHaveBeenCalledWith("senha-secreta");
  });

  it("limpa o clipboard depois do tempo configurado", async () => {
    const clipboard = mockClipboard();
    await copyWithAutoClear("senha-secreta");

    await vi.advanceTimersByTimeAsync(CLEAR_DELAY_MS + 100);

    expect(await clipboard.readText()).toBe("");
  });

  it("NÃO limpa antes do tempo configurado", async () => {
    const clipboard = mockClipboard();
    await copyWithAutoClear("senha-secreta");

    await vi.advanceTimersByTimeAsync(CLEAR_DELAY_MS - 5000);

    expect(await clipboard.readText()).toBe("senha-secreta");
  });

  it("não apaga um valor NOVO copiado depois (proteção contra sobrescrever)", async () => {
    const clipboard = mockClipboard();
    await copyWithAutoClear("senha-antiga", 5000);

    // Antes do timer da senha antiga disparar, copiamos outra coisa.
    await vi.advanceTimersByTimeAsync(2000);
    await copyWithAutoClear("senha-nova", 20000);

    // Agora avança até o timer da PRIMEIRA cópia disparar — não deve
    // apagar a senha nova, porque o clipboard já não tem mais o valor
    // antigo.
    await vi.advanceTimersByTimeAsync(3500);
    expect(await clipboard.readText()).toBe("senha-nova");
  });

  it("não lança erro se a leitura do clipboard for negada pelo navegador", async () => {
    const clipboard = mockClipboard();
    clipboard.readText = vi.fn().mockRejectedValue(new Error("Permission denied"));

    await copyWithAutoClear("senha-secreta", 1000);
    await expect(vi.advanceTimersByTimeAsync(1500)).resolves.not.toThrow();
  });
});
