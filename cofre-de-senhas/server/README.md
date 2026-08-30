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
| `REDIS_URL` | não | Conexão Redis para rate limiting escalável entre múltiplas instâncias. Sem isso, cai para armazenamento em memória (ok para uma única instância) |
| `JWT_SECRET` | **sim, para o Meu Cofre** | Segredo pra assinar os JWTs de acesso das contas do cofre. Sem isso, cadastro/login do cofre falha (o resto do backend continua normal) |
| `DB_PATH` | não (padrão `./data.sqlite`) | Caminho do banco SQLite do Meu Cofre — use `:memory:` para testes |

## Escalabilidade do rate limiting

Por padrão, o rate limiter guarda a contagem de requisições em memória,
dentro do próprio processo Node. Isso funciona perfeitamente com uma
instância só (o cenário atual em produção), mas **não é escalável
horizontalmente**: se um dia houver mais de uma instância do backend atrás
de um load balancer, cada uma teria seu próprio contador, e alguém
poderia burlar o limite alternando entre elas.

Configurando `REDIS_URL`, o rate limiter passa a usar Redis como
armazenamento compartilhado (via `rate-limit-redis`), e o limite passa a
valer de verdade entre quantas instâncias existirem. Serviços como
[Upstash](https://upstash.com/) oferecem Redis gratuito compatível com
esse uso.

## Endpoints

**Verificador de vazamento (público, sem login):**
- `GET /api/health` — healthcheck simples, sempre `{ status: "ok" }`
- `GET /api/check-pwned/:prefix` — proxy do HIBP; `:prefix` precisa ser 5
  caracteres hexadecimais
- `GET /api/stats` — contadores agregados (total de consultas, total de
  bloqueios por rate limit); retorna `available: false` se o Firestore não
  estiver configurado

**Meu Cofre (autenticação e itens):**
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`,
  `POST /api/auth/logout` — ciclo de vida da sessão
- `GET /api/auth/kdf-params?email=...` — rota pública que devolve o salt e
  as iterações de PBKDF2 de uma conta, necessário para o navegador
  calcular o `authProof` antes do login (ver `src/lib/vaultCrypto.js` no
  frontend)
- `POST /api/auth/2fa/setup`, `POST /api/auth/2fa/verify` — ativação de 2FA
- `POST /api/auth/change-master-password` — troca de senha mestra,
  revoga todas as sessões existentes
- `GET/POST/PUT/DELETE /api/vault/items` — CRUD dos itens do cofre (todos
  exigem token de acesso válido)
- `GET /api/vault/items/:id/history` — histórico de versões de um item

## Testes

```bash
npm test
```

## Teste de ponta a ponta (servidor real)

```bash
npm run dev   # em um terminal
./scripts/e2e-smoke-test.sh   # em outro terminal
```

Diferente dos testes automatizados (que rodam em processo, via
`supertest`), este script bate via HTTP de verdade contra um servidor
rodando — pega problemas que só aparecem no mundo real (porta errada,
variável de ambiente faltando, CORS mal configurado). Roda de novo depois
de qualquer deploy:

```bash
BASE_URL=https://sua-api.onrender.com ./scripts/e2e-smoke-test.sh
```

Inclui testes de integração reais via `supertest` (rotas HTTP de verdade,
incluindo o rate limiter estourando o limite configurado).

## Retenção de dados

Os documentos em `pwned_checks` e `rate_limit_events` recebem um campo
`expiresAt` (90 dias no futuro). Isso sozinho não apaga nada — é preciso
ativar a política de TTL do Firestore apontando pra esse campo:

1. No [Firebase Console](https://console.firebase.google.com/) → Firestore
   Database → aba "TTL" (ou via `gcloud`: `gcloud firestore fields ttls
   update expiresAt --collection-group=pwned_checks --enable-ttl`,
   repetindo para `rate_limit_events`)
2. Depois de ativado, o próprio banco remove os documentos vencidos — sem
   custo de leitura/escrita adicional pra isso.

Veja [PRIVACY.md](../PRIVACY.md) na raiz do projeto para a política completa.

## Deploy

Qualquer host que rode um processo Node contínuo funciona: Railway (mais
simples, conecte o repo e aponte o diretório raiz para `server`), Oracle
Cloud Free Tier (com `pm2` + Nginx como proxy reverso com HTTPS), ou
Google Cloud Run.

## Monitoramento de disponibilidade

O plano gratuito do Render hiberna o serviço após um período de
inatividade — a primeira requisição depois disso demora até ~1 minuto pra
responder. Duas formas de lidar com isso:

1. **Aceitar a hibernação** e mostrar isso na UI (já feito — ver o aviso
   na tela de análise).
2. **Evitar a hibernação** configurando um monitor gratuito (ex:
   [UptimeRobot](https://uptimerobot.com/)) para bater em `/api/health` a
   cada 5 minutos. Isso mantém o serviço sempre ativo, com o efeito
   colateral positivo de te avisar (por e-mail) se o backend cair de
   verdade.
