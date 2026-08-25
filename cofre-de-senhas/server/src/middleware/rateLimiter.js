import rateLimit from "express-rate-limit";
import { logRateLimitHit } from "../services/logger.js";
import { hashIp } from "../utils/hashIp.js";

// Fábrica em vez de instância fixa: permite configurar limites diferentes
// (e testar com uma janela curta) sem duplicar a lógica de handler/log.
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 30 } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logRateLimitHit({ ipHash: hashIp(req.ip) }).catch(() => {});
      res.status(429).json({
        error: "Muitas requisições. Tente novamente em alguns minutos.",
      });
    },
  });
}

// Instância padrão usada em produção: 30 consultas a cada 15 minutos por IP.
export const rateLimiter = createRateLimiter();
