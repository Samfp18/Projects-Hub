import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import pwnedRouter from "../routes/pwned.js";
import statsRouter from "../routes/stats.js";

// Monta uma app equivalente à real, mas com um rate limiter de janela curta
// e limite baixo — assim o teste de estouro roda em milissegundos em vez de
// esperar minutos.
function buildTestApp({ max = 3 } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: "http://localhost:5173" }));
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api", createRateLimiter({ windowMs: 60_000, max }), pwnedRouter);
  app.use("/api", statsRouter);
  return app;
}

describe("GET /api/health", () => {
  it("responde 200 com status ok", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /api/check-pwned/:prefix", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("0018A45C4D1DEF81644B54AB7F969B88D65:1\n"),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna 400 para prefixo mal formado", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/check-pwned/xyz");
    expect(res.status).toBe(400);
  });

  it("retorna o range de hashes para um prefixo válido", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/check-pwned/5BAA6");
    expect(res.status).toBe(200);
    expect(res.text).toContain("0018A45C4D1DEF81644B54AB7F969B88D65:1");
  });

  it("aplica rate limiting após exceder o número de requisições permitido", async () => {
    const app = buildTestApp({ max: 3 });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/api/check-pwned/5BAA6");
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get("/api/check-pwned/5BAA6");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/Muitas requisições/);
  });
});

describe("GET /api/stats", () => {
  it("responde de forma graciosa quando o Firestore não está configurado", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });
});
