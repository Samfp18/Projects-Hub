import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./middleware/rateLimiter.js";
import pwnedRouter from "./routes/pwned.js";
import statsRouter from "./routes/stats.js";

export function createApp() {
  const app = express();

  // Necessário atrás de um proxy reverso (Railway, Oracle Cloud com Nginx,
  // etc.) para que req.ip reflita o IP real do visitante, não o do proxy.
  app.set("trust proxy", 1);

  app.use(helmet());

  const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
  app.use(cors({ origin: allowedOrigin }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api", rateLimiter, pwnedRouter);
  app.use("/api", statsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  return app;
}
