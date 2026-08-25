import { describe, it, expect } from "vitest";
import { hashIp } from "../utils/hashIp.js";

describe("hashIp", () => {
  it("produz o mesmo hash para o mesmo IP e salt", () => {
    expect(hashIp("203.0.113.10", "salt-teste")).toBe(hashIp("203.0.113.10", "salt-teste"));
  });

  it("produz hashes diferentes para IPs diferentes", () => {
    expect(hashIp("203.0.113.10", "salt-teste")).not.toBe(hashIp("203.0.113.11", "salt-teste"));
  });

  it("produz hashes diferentes para o mesmo IP com salts diferentes", () => {
    expect(hashIp("203.0.113.10", "salt-a")).not.toBe(hashIp("203.0.113.10", "salt-b"));
  });

  it("nunca retorna o IP original em texto puro", () => {
    const result = hashIp("203.0.113.10", "salt-teste");
    expect(result).not.toContain("203.0.113.10");
  });

  it("lida com IP ausente sem lançar erro", () => {
    expect(hashIp(undefined)).toBe("unknown");
    expect(hashIp(null)).toBe("unknown");
    expect(hashIp("")).toBe("unknown");
  });

  it("retorna uma string hexadecimal curta e fixa", () => {
    const result = hashIp("203.0.113.10", "salt-teste");
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });
});
