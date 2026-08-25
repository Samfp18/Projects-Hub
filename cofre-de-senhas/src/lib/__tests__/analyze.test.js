import { describe, it, expect } from "vitest";
import { analyzePassword } from "../analyze.js";

describe("analyzePassword", () => {
  it("classifica senha vazia como VAZIA, sem erros", () => {
    const result = analyzePassword("");
    expect(result.label).toBe("VAZIA");
    expect(result.entropyBits).toBe(0);
  });

  it("classifica senhas comuns como FRACA", () => {
    for (const pw of ["123456", "senha123", "qwerty", "admin"]) {
      expect(analyzePassword(pw).label).toBe("FRACA");
    }
  });

  it("detecta sequência de teclado", () => {
    const result = analyzePassword("qwerty123456");
    expect(result.reasons.some((r) => /sequência previsível/i.test(r))).toBe(true);
  });

  it("detecta caracteres repetidos em excesso", () => {
    const result = analyzePassword("aaaaaaaa1B!");
    expect(result.reasons.some((r) => /repetidos/i.test(r))).toBe(true);
  });

  it("detecta senha só numérica", () => {
    const result = analyzePassword("98765432109");
    expect(result.reasons.some((r) => /apenas números/i.test(r))).toBe(true);
  });

  it("classifica senha longa e aleatória como FORTE ou BLINDADA", () => {
    const result = analyzePassword("7jyf.M-M_5^_]g^%U3/V");
    expect(["FORTE", "BLINDADA"]).toContain(result.label);
    expect(result.entropyBits).toBeGreaterThan(65);
  });

  it("entropia cresce com o comprimento para o mesmo conjunto de caracteres", () => {
    const curta = analyzePassword("Ab3!Ab3!");
    const longa = analyzePassword("Ab3!Ab3!Ab3!Ab3!Ab3!");
    expect(longa.entropyBits).toBeGreaterThan(curta.entropyBits);
  });
});
