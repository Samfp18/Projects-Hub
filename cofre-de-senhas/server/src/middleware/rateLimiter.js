import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { logRateLimitHit } from "../services/logger.js";
import { hashIp } from "../utils/hashIp.js";
import { getRedisClient } from "../services/redis.js";

// Fábrica em vez de instância fixa: permite configurar limites diferentes
// (e testar com uma janela curta) sem duplicar a lógica de handler/log.
//
// O `store` é escalável horizontalmente quando REDIS_URL está configurada
// (compartilha a contagem entre todas as instâncias do backend); sem
// Redis, cai para o armazenamento em memória padrão do express-rate-limit,
// que funciona bem com uma única instância — ver services/redis.js para a
// explicação completa do porquê isso importa.
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 30 } = {}) {
  const redisClient = getRedisClient();

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient
      ? new RedisStore({
          sendCommand: (...args) => redisClient.call(...args),
          prefix: "cofre-de-senhas-rl:",
        })
      : undefined,
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
