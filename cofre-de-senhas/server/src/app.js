import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { createAuthRateLimiter } from "./middleware/vaultRateLimiter.js";
import pwnedRouter from "./routes/pwned.js";
import statsRouter from "./routes/stats.js";
import { createDb } from "./db/schema.js";
import { createAuditLogger as createVaultAuditLogger } from "./services/vaultAuditLog.js";
import { createAuthRouter as createVaultAuthRouter } from "./routes/vaultAuth.js";
import { createVaultRouter } from "./routes/vault.js";

// dbPath é opcional e serve principalmente para testes (":memory:" cria um
// banco novo e isolado por execução, sem tocar em nenhum arquivo real).
export function createApp({ dbPath } = {}) {
  const app = express();

  // Necessário atrás de um proxy reverso (Railway, Oracle Cloud com Nginx,
  // etc.) para que req.ip reflita o IP real do visitante, não o do proxy.
  app.set("trust proxy", 1);

  app.use(helmet());

  const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // Verificador de vazamento (HIBP) + estatísticas — não precisa de
  // conta nem login, é a parte "pública" do Cofre de Senhas.
  //
  // O rate limiter é montado no caminho EXATO da consulta de vazamento
  // ("/api/check-pwned"), nunca no prefixo genérico "/api" — antes dessa
  // correção, ele também contava (e limitava) as requisições de
  // login/cadastro do cofre pessoal, que vivem sob esse mesmo prefixo
  // mas não têm nada a ver com consulta de vazamento.
  app.use("/api/check-pwned", rateLimiter);
  app.use("/api", pwnedRouter);
  app.use("/api", statsRouter);

  // Cofre pessoal (vault) — precisa de conta, autenticação, e usa um
  // banco separado (SQLite) do restante do app (que usa Firestore, se
  // configurado, só para os logs do verificador de vazamento).
  const vaultDb = createDb(dbPath);
  const vaultAuditLogger = createVaultAuditLogger(vaultDb);
  app.use("/api/auth", createAuthRateLimiter(), createVaultAuthRouter({ db: vaultDb, auditLogger: vaultAuditLogger }));
  app.use("/api/vault", createVaultRouter({ db: vaultDb }));

  app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  // Rede de segurança: se qualquer rota deixar um erro escapar sem
  // tratar (esquecendo um try/catch, por exemplo), isso captura antes
  // que o Express devolva o stack trace completo pro cliente — o que
  // vazaria caminhos de arquivo do servidor, nomes de dependências, e
  // possivelmente fragmentos de query SQL. O erro real ainda vai pro log
  // do servidor (console.error), só a resposta ao cliente fica genérica.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[erro não tratado]", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return { app, vaultDb };
}
