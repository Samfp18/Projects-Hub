import { describe, it, expect } from "vitest";
import { analyzePassword } from "../analyze.js";

describe("analyzePassword", () => {
  it("classifica senha vazia como VAZIA, sem erros", async () => {
    const result = await analyzePassword("");
    expect(result.label).toBe("VAZIA");
    expect(result.entropyBits).toBe(0);
  });

  it("classifica senhas comuns como FRACA", async () => {
    for (const pw of ["123456", "senha123", "qwerty", "admin"]) {
      const result = await analyzePassword(pw);
      expect(result.label).toBe("FRACA");
    }
  });

  it("detecta sequência de teclado/numérica e explica o motivo", async () => {
    const result = await analyzePassword("qwerty123456");
    expect(result.label).toBe("FRACA");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("detecta caracteres repetidos em excesso", async () => {
    const result = await analyzePassword("aaaaaaaa1B!");
    expect(["FRACA", "REGULAR"]).toContain(result.label);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("detecta sequência numérica previsível", async () => {
    const result = await analyzePassword("98765432109");
    expect(result.label).toBe("FRACA");
    expect(result.reasons.some((r) => /sequ[êe]ncia/i.test(r))).toBe(true);
  });

  it("detecta termo popular no Brasil não coberto pelo dicionário padrão", async () => {
    const result = await analyzePassword("Flamengo2024!xk9");
    expect(result.reasons.some((r) => /popular no Brasil/i.test(r))).toBe(true);
  });

  it("classifica senha longa e aleatória como FORTE ou BLINDADA", async () => {
    const result = await analyzePassword("7jyf.M-M_5^_]g^%U3/V");
    expect(["FORTE", "BLINDADA"]).toContain(result.label);
    expect(result.entropyBits).toBeGreaterThan(65);
  });

  it("entropia cresce com o comprimento para o mesmo conjunto de caracteres", async () => {
    const curta = await analyzePassword("Ab3!Ab3!");
    const longa = await analyzePassword("Ab3!Ab3!Ab3!Ab3!Ab3!");
    expect(longa.entropyBits).toBeGreaterThan(curta.entropyBits);
  });
});
