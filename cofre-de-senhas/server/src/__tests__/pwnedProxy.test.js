import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { queryPwnedRange, InvalidPrefixError, UpstreamError } from "../services/pwnedProxy.js";

describe("queryPwnedRange", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejeita prefixos com formato inválido antes de chamar a rede", async () => {
    global.fetch = vi.fn();
    await expect(queryPwnedRange("xyz")).rejects.toThrow(InvalidPrefixError);
    await expect(queryPwnedRange("12345678")).rejects.toThrow(InvalidPrefixError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("consulta a URL correta do HIBP com o prefixo em maiúsculas", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("0018A45C4D1DEF81644B54AB7F969B88D65:1\n"),
    });

    await queryPwnedRange("5baa6");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.pwnedpasswords.com/range/5BAA6",
      expect.objectContaining({
        headers: expect.objectContaining({ "Add-Padding": "true" }),
      })
    );
  });

  it("retorna o corpo da resposta como texto", async () => {
    const body = "0018A45C4D1DEF81644B54AB7F969B88D65:1\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\n";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(body) });

    const result = await queryPwnedRange("5BAA6");
    expect(result).toBe(body);
  });

  it("lança UpstreamError se o HIBP responder com erro", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(queryPwnedRange("5BAA6")).rejects.toThrow(UpstreamError);
  });
});
