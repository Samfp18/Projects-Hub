import { describe, it, expect, beforeEach, vi } from "vitest";

describe("getRedisClient", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.REDIS_URL;
  });

  it("retorna null quando REDIS_URL não está definida", async () => {
    const { getRedisClient } = await import("../services/redis.js");
    expect(getRedisClient()).toBeNull();
  });

  it("continua retornando null em chamadas repetidas, sem tentar reconectar", async () => {
    const { getRedisClient } = await import("../services/redis.js");
    expect(getRedisClient()).toBeNull();
    expect(getRedisClient()).toBeNull();
  });
});
