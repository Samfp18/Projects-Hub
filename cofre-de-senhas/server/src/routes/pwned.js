import { Router } from "express";
import { queryPwnedRange, InvalidPrefixError, UpstreamError } from "../services/pwnedProxy.js";
import { logCheck } from "../services/logger.js";
import { hashIp } from "../utils/hashIp.js";

const router = Router();

router.get("/check-pwned/:prefix", async (req, res) => {
  const { prefix } = req.params;

  try {
    const rangeText = await queryPwnedRange(prefix);
    res.type("text/plain").send(rangeText);

    const candidatesReturned = rangeText
      .trim()
      .split("\n")
      .filter(Boolean).length;

    // Log é disparado depois da resposta e nunca bloqueia nem derruba a
    // requisição do usuário caso o Firestore esteja indisponível.
    logCheck({
      ipHash: hashIp(req.ip),
      prefix: prefix.toUpperCase(),
      candidatesReturned,
    }).catch(() => {});
  } catch (err) {
    if (err instanceof InvalidPrefixError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof UpstreamError) {
      return res.status(502).json({ error: "Não foi possível consultar a base de vazamentos agora." });
    }
    console.error("[check-pwned] erro inesperado:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
});

export default router;
