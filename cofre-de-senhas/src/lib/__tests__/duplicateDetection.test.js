import { describe, it, expect } from "vitest";
import { findDuplicatePasswordIds } from "../duplicateDetection.js";

describe("findDuplicatePasswordIds", () => {
  it("não marca nada quando todas as senhas são diferentes", () => {
    const items = [
      { id: 1, password: "senhaA" },
      { id: 2, password: "senhaB" },
    ];
    expect(findDuplicatePasswordIds(items).size).toBe(0);
  });

  it("marca os dois itens que compartilham a mesma senha", () => {
    const items = [
      { id: 1, password: "repetida123" },
      { id: 2, password: "unica456" },
      { id: 3, password: "repetida123" },
    ];
    const result = findDuplicatePasswordIds(items);
    expect(result.has(1)).toBe(true);
    expect(result.has(3)).toBe(true);
    expect(result.has(2)).toBe(false);
  });

  it("ignora itens sem senha (ex: notas seguras)", () => {
    const items = [
      { id: 1, password: "" },
      { id: 2, password: undefined },
      { id: 3, password: "" },
    ];
    expect(findDuplicatePasswordIds(items).size).toBe(0);
  });

  it("marca corretamente quando três ou mais itens compartilham a mesma senha", () => {
    const items = [
      { id: 1, password: "mesma" },
      { id: 2, password: "mesma" },
      { id: 3, password: "mesma" },
    ];
    expect(findDuplicatePasswordIds(items).size).toBe(3);
  });

  it("lista vazia não gera erro", () => {
    expect(findDuplicatePasswordIds([]).size).toBe(0);
  });
});
