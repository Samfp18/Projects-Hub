import { describe, it, expect } from "vitest";
import { generatePasswordFromPhrase, substituteChar } from "../generateFromPhrase.js";

describe("substituteChar", () => {
  it("prioriza símbolo sobre número quando ambos ativos", () => {
    expect(substituteChar("a", true, true)).toBe("@");
    expect(substituteChar("s", true, true)).toBe("$");
  });

  it("usa número quando só o modo dígitos está ativo", () => {
    expect(substituteChar("a", true, false)).toBe("4");
    expect(substituteChar("e", true, false)).toBe("3");
  });

  it("mantém a letra original se nenhum modo estiver ativo", () => {
    expect(substituteChar("a", false, false)).toBe("a");
  });

  it("mantém letras sem regra de substituição (ex: 'c', 'n')", () => {
    expect(substituteChar("c", true, true)).toBe("c");
    expect(substituteChar("n", true, true)).toBe("n");
  });
});

describe("generatePasswordFromPhrase", () => {
  it("lança erro para frase vazia", () => {
    expect(() => generatePasswordFromPhrase("")).toThrow(/Digite uma frase/);
    expect(() => generatePasswordFromPhrase("   ")).toThrow(/Digite uma frase/);
  });

  it("remove espaços quando removeSpaces=true", () => {
    const pw = generatePasswordFromPhrase("casa segura", {
      length: 0,
      useUpper: false,
      useDigits: false,
      useSymbols: false,
      removeSpaces: true,
      pad: false,
    });
    expect(pw).not.toContain(" ");
    expect(pw).toBe("casasegura");
  });

  it("troca espaços por hífen quando removeSpaces=false", () => {
    const pw = generatePasswordFromPhrase("casa segura", {
      length: 0,
      useUpper: false,
      useDigits: false,
      useSymbols: false,
      removeSpaces: false,
      pad: false,
    });
    expect(pw).toBe("casa-segura");
  });

  it("remove acentos", () => {
    const pw = generatePasswordFromPhrase("café com ação", {
      length: 0,
      useUpper: false,
      useDigits: false,
      useSymbols: false,
      removeSpaces: true,
      pad: false,
    });
    expect(pw).toBe("cafecomacao");
  });

  it("nunca deixa uma letra mapeada como está quando useDigits ou useSymbols está ativo", () => {
    // 'a', 's', 'e', 'i', 'o', 't' têm regra de substituição — não devem
    // sobrar como letra minúscula literal no resultado quando qualquer um
    // dos dois modos leet está ligado.
    const pw = generatePasswordFromPhrase("casa segura eterna", {
      length: 0,
      useUpper: false,
      useDigits: true,
      useSymbols: false,
      removeSpaces: true,
      pad: false,
    });
    for (const mapped of ["a", "s", "e", "o", "t"]) {
      expect(pw.includes(mapped)).toBe(false);
    }
  });

  it("preserva letras sem regra de substituição", () => {
    const pw = generatePasswordFromPhrase("um cachorro", {
      length: 0,
      useUpper: false,
      useDigits: true,
      useSymbols: true,
      removeSpaces: true,
      pad: false,
    });
    // 'u', 'm', 'c', 'h', 'r', 'n' não têm regra — devem continuar lá
    expect(pw).toMatch(/[uchmrn]/);
  });

  it("completa com padding aleatório até o comprimento mínimo pedido", () => {
    const pw = generatePasswordFromPhrase("oi", {
      length: 20,
      useUpper: true,
      useDigits: true,
      useSymbols: true,
      removeSpaces: true,
      pad: true,
    });
    expect(pw.length).toBe(20);
  });

  it("não corta a frase mesmo se ela for mais longa que o comprimento pedido", () => {
    const pw = generatePasswordFromPhrase("uma frase razoavelmente longa para teste", {
      length: 5,
      pad: true,
    });
    expect(pw.length).toBeGreaterThan(5);
  });

  it("não faz padding quando pad=false, mesmo abaixo do comprimento mínimo", () => {
    const pw = generatePasswordFromPhrase("oi", {
      length: 30,
      useUpper: false,
      useDigits: false,
      useSymbols: false,
      removeSpaces: true,
      pad: false,
    });
    expect(pw).toBe("oi");
  });

  it("aplica maiúsculas aleatórias apenas quando useUpper=true", () => {
    const semMaiusculas = generatePasswordFromPhrase("abcdefghijklmnop", {
      length: 0,
      useUpper: false,
      useDigits: false,
      useSymbols: false,
      removeSpaces: true,
      pad: false,
    });
    expect(semMaiusculas).toBe(semMaiusculas.toLowerCase());

    // Com muitas letras e useUpper=true, a chance de NENHUMA virar
    // maiúscula é (0.5)^16 — desprezível. Testamos isso estatisticamente.
    let algumaMaiuscula = false;
    for (let i = 0; i < 20 && !algumaMaiuscula; i++) {
      const pw = generatePasswordFromPhrase("abcdefghijklmnop", {
        length: 0,
        useUpper: true,
        useDigits: false,
        useSymbols: false,
        removeSpaces: true,
        pad: false,
      });
      if (pw !== pw.toLowerCase()) algumaMaiuscula = true;
    }
    expect(algumaMaiuscula).toBe(true);
  });
});
