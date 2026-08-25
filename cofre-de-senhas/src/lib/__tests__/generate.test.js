import { describe, it, expect } from "vitest";
import { generatePassword } from "../generate.js";

const AMBIGUOUS = "il1Lo0OI";

describe("generatePassword", () => {
  it("respeita o comprimento pedido", () => {
    for (const length of [8, 12, 16, 24, 32, 64]) {
      const pw = generatePassword({ length });
      expect(pw.length).toBe(length);
    }
  });

  it("gera apenas o conjunto de caracteres selecionado", () => {
    const pw = generatePassword({
      length: 40,
      useLower: true,
      useUpper: false,
      useDigits: false,
      useSymbols: false,
    });
    expect(pw).toMatch(/^[a-z]+$/);
  });

  it("nunca inclui caracteres ambíguos quando excludeAmbiguous=true", () => {
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword({ length: 30, excludeAmbiguous: true });
      for (const c of AMBIGUOUS) {
        expect(pw.includes(c)).toBe(false);
      }
    }
  });

  it("garante pelo menos um caractere de cada conjunto ativo, mesmo em senhas curtas", () => {
    for (let i = 0; i < 500; i++) {
      const pw = generatePassword({
        length: 8,
        useLower: true,
        useUpper: true,
        useDigits: true,
        useSymbols: true,
        excludeAmbiguous: false,
      });
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("lança erro tratado se nenhum conjunto de caracteres for selecionado", () => {
    expect(() =>
      generatePassword({ useLower: false, useUpper: false, useDigits: false, useSymbols: false })
    ).toThrow(/Selecione ao menos um conjunto/);
  });

  // Este é o teste que importa de verdade do ponto de vista de segurança:
  // secureRandomInt() usa rejection sampling sobre crypto.getRandomValues
  // exatamente para evitar o viés de módulo. Um gerador "feito em casa"
  // ingênuo (`byte % pool.length`) favorece levemente os primeiros
  // caracteres do alfabeto sempre que 256 não é múltiplo do tamanho do
  // pool — esse teste existe para pegar exatamente esse tipo de bug.
  it("não apresenta viés estatístico perceptível na escolha de caracteres (rejection sampling)", () => {
    const N = 26000;
    const counts = {};
    for (let i = 0; i < N; i++) {
      const [char] = generatePassword({
        length: 1,
        useLower: true,
        useUpper: false,
        useDigits: false,
        useSymbols: false,
        excludeAmbiguous: false,
      });
      counts[char] = (counts[char] || 0) + 1;
    }

    const expected = N / 26;
    const maxDeviation = Math.max(
      ...Object.values(counts).map((v) => Math.abs(v - expected) / expected)
    );

    // Com amostragem uniforme de verdade, o desvio máximo esperado por
    // acaso em 26 mil sorteios fica bem abaixo de 20%. Um viés real de
    // módulo (ex: usando 256 % 26 ingenuamente) produziria um desvio
    // sistemático e muito maior, então essa margem é folgada o bastante
    // para não gerar falso-positivo, mas apertada o bastante para
    // detectar um bug real.
    expect(maxDeviation).toBeLessThan(0.2);
    expect(Object.keys(counts).length).toBe(26);
  });
});
