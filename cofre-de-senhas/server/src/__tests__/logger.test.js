import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do módulo de conexão com o Firestore ANTES de importar o logger,
// para capturar exatamente o que seria gravado no banco sem precisar de
// uma credencial real (que este sandbox nem teria acesso de rede pra usar).
vi.mock("../services/firestore.js", () => {
  const addedDocs = { pwned_checks: [], rate_limit_events: [] };
  const summarySets = [];

  const fakeDb = {
    collection: (name) => ({
      add: (doc) => {
        addedDocs[name]?.push(doc);
        return Promise.resolve({ id: "fake-id" });
      },
      doc: () => ({
        set: (data, options) => {
          summarySets.push({ data, options });
          return Promise.resolve();
        },
      }),
    }),
  };

  return {
    getDb: () => fakeDb,
    FieldValue: { serverTimestamp: () => "SERVER_TIMESTAMP", increment: (n) => ({ __increment: n }) },
    __test__: { addedDocs, summarySets },
  };
});

import { logCheck, logRateLimitHit, computeExpiresAt } from "../services/logger.js";
import * as firestoreMock from "../services/firestore.js";

describe("computeExpiresAt", () => {
  it("calcula uma data ~90 dias no futuro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const result = computeExpiresAt();

    expect(result.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    vi.useRealTimers();
  });
});

describe("logCheck — retenção de dados", () => {
  beforeEach(() => {
    firestoreMock.__test__.addedDocs.pwned_checks.length = 0;
  });

  it("grava um campo expiresAt no documento de log", async () => {
    await logCheck({ ipHash: "abc123", prefix: "5BAA6", candidatesReturned: 3 });

    const [doc] = firestoreMock.__test__.addedDocs.pwned_checks;
    expect(doc.expiresAt).toBeInstanceOf(Date);
    expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("nunca grava a senha, hash completo ou IP em texto puro no documento", async () => {
    await logCheck({ ipHash: "abc123", prefix: "5BAA6", candidatesReturned: 3 });

    const [doc] = firestoreMock.__test__.addedDocs.pwned_checks;
    const keys = Object.keys(doc);
    expect(keys.sort()).toEqual(["candidatesReturned", "expiresAt", "ipHash", "prefix", "timestamp"].sort());
    expect(doc.ipHash).toBe("abc123"); // já é o hash, não o IP — o hashing acontece antes de chegar aqui
  });
});

describe("logRateLimitHit — retenção de dados", () => {
  beforeEach(() => {
    firestoreMock.__test__.addedDocs.rate_limit_events.length = 0;
  });

  it("grava um campo expiresAt no evento de rate limit", async () => {
    await logRateLimitHit({ ipHash: "def456" });

    const [doc] = firestoreMock.__test__.addedDocs.rate_limit_events;
    expect(doc.expiresAt).toBeInstanceOf(Date);
    expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
