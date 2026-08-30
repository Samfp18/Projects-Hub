import rateLimit from "express-rate-limit";

export function createAuthRateLimiter({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    },
  });
}
