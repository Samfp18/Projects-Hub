# Cofre de Senhas — API

Backend de apoio ao frontend do Cofre de Senhas. Não guarda senha nenhuma —
existe só para três coisas:

1. Repassar a consulta de k-anonimato ao Have I Been Pwned.
2. Aplicar rate limiting (30 requisições / 15 min por IP).
3. Registrar logs de segurança agregados no Firestore, sem armazenar IP em
   texto puro (ver `src/utils/hashIp.js`).

Veja o [README principal](../README.md) para a visão geral da arquitetura.

## Rodando localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Sobe em `http://localhost:3001`. Funciona sem Firestore configurado — os
logs simplesmente vão para o console em vez de serem persistidos.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não (padrão 3001) | Porta do servidor |
| `ALLOWED_ORIGIN` | recomendada | Origem permitida por CORS (URL do frontend) |
| `IP_HASH_SALT` | recomendada | Salt para o hash de IPs nos logs — gere um valor único em produção |
| `FIREBASE_SERVICE_ACCOUNT` | não | JSON da service account do Firebase, em uma linha. Sem isso, logs só vão pro console |

## Endpoints

- `GET /api/health` — healthcheck simples, sempre `{ status: "ok" }`
- `GET /api/check-pwned/:prefix` — proxy do HIBP; `:prefix` precisa ser 5
  caracteres hexadecimais
- `GET /api/stats` — contadores agregados (total de consultas, total de
  bloqueios por rate limit); retorna `available: false` se o Firestore não
  estiver configurado

## Testes

```bash
npm test
```

Inclui testes de integração reais via `supertest` (rotas HTTP de verdade,
incluindo o rate limiter estourando o limite configurado).

## Deploy

Qualquer host que rode um processo Node contínuo funciona: Railway (mais
simples, conecte o repo e aponte o diretório raiz para `server`), Oracle
Cloud Free Tier (com `pm2` + Nginx como proxy reverso com HTTPS), ou
Google Cloud Run.
