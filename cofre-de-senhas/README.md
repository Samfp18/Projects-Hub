# 🔐 Cofre de Senhas

[![CI](https://github.com/Samfp18/Projects-Hub/actions/workflows/ci.yml/badge.svg)](https://github.com/Samfp18/Projects-Hub/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Testes](https://img.shields.io/badge/testes-47%20passando-brightgreen)](./README.md#-qualidade-e-opera%C3%A7%C3%A3o)

> Verificador e gerador de senhas seguras. Frontend 100% client-side; um
> backend leve atua só como proxy de rede e observabilidade — nunca vê
> senha, hash completo, nem armazena nada sensível.

**🔗 [Testar ao vivo](https://cofre-senha.netlify.app/)**

Um dossiê interativo para analisar a força de uma senha (entropia, padrões
previsíveis, verificação contra vazamentos conhecidos via [Have I Been
Pwned](https://haveibeenpwned.com/)) e para gerar novas senhas
criptograficamente seguras.

Projeto feito para portfólio de segurança da informação: mostra na prática
conceitos como entropia de senha, k-anonimato, CSPRNG (gerador de números
aleatórios criptograficamente seguro) e a diferença entre "parece seguro" e
"é matematicamente seguro".

---

## ✨ Funcionalidades

- **Análise de força**: usa [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn)
  (dicionário em português brasileiro) — o mesmo tipo de algoritmo usado por
  produtos de segurança reais, não uma heurística caseira. Modela ataques
  de dicionário, padrões de teclado, datas, l33tspeak e variações de
  maiúsculas, e estima o tempo de quebra por força bruta.
- **Verificação de vazamento**: consulta a base do Have I Been Pwned usando
  o modelo de **k-anonimato**: apenas os 5 primeiros caracteres do hash
  SHA-1 da senha são enviados pela rede. A senha em texto puro nunca sai
  do navegador. A consulta passa pelo backend próprio (`server/`), que
  funciona só como repassador — ver seção de Arquitetura abaixo.
- **Gerador seguro**: usa `crypto.getRandomValues` (CSPRNG do navegador) com
  *rejection sampling* para evitar viés estatístico — nunca `Math.random()`.
- **Gerador a partir de frase**: transforma uma frase memorável em senha
  (leetspeak configurável, capitalização aleatória, preenchimento opcional
  com caracteres aleatórios). Deixa claro na interface que essa senha é
  menos imprevisível que uma totalmente aleatória do mesmo tamanho.
- **Mostrar/ocultar senha**: em todas as telas, a senha começa oculta por
  padrão (útil em ambientes compartilhados ou capturas de tela) e só
  aparece com um clique explícito em "revelar".
- **Backend de apoio**: proxy do Have I Been Pwned com rate limiting (30
  consultas/15min por IP) e logs de segurança agregados no Firestore — sem
  nunca armazenar senha, hash completo ou IP em texto puro.
- **Interface bilíngue**: alterna entre português e inglês com um clique,
  sem recarregar a página.

## 🏗️ Arquitetura

```
cofre-de-senhas/
├── src/            → frontend (React + Vite + Tailwind)
└── server/         → backend (Node + Express)
```

O frontend continua fazendo todo o trabalho sensível localmente: calcula a
entropia, gera as senhas, calcula o hash SHA-1 da senha digitada. O backend
existe só para três coisas, nenhuma delas envolvendo a senha em si:

1. **Repassar a consulta de k-anonimato ao HIBP** — o navegador manda o
   prefixo de 5 caracteres pro nosso servidor, que manda pro HIBP e devolve
   a resposta. Isso evita que o navegador do usuário dependa diretamente de
   CORS/disponibilidade de um serviço de terceiros.
2. **Rate limiting** — protege contra abuso e evita que o IP do projeto
   inteiro seja bloqueado pelo HIBP por excesso de requisições de um único
   visitante malicioso.
3. **Observabilidade** — grava no Firestore quantas consultas foram feitas
   (contador agregado, leitura O(1), não uma varredura da coleção inteira)
   e detecta picos de tentativas de abuso. O IP nunca é gravado em texto
   puro — só um hash SHA-256 com salt (`server/src/utils/hashIp.js`).

O backend é opcional para rodar o projeto: se `FIREBASE_SERVICE_ACCOUNT` não
estiver configurada, ele funciona normalmente e só deixa de persistir logs
(cai para `console.log`).

**Sobre inspecionar o código do frontend:** não existe forma de impedir isso
de verdade — o navegador precisa baixar o código pra executá-lo, então
`Ctrl+U`, DevTools e `curl` sempre vão conseguir ver o que foi enviado. O
build de produção (`npm run build`) já vem minificado e sem sourcemaps, o
que é a prática padrão da indústria para não facilitar a leitura casual —
mas isso não é "esconder" o código, é só não fazer de graça algo que
qualquer ferramenta de build já resolve. Bloqueios de clique direito ou de
DevTools foram propositalmente deixados de fora: são triviais de contornar
e, num projeto de segurança da informação, soam mais a teatro de segurança
do que a proteção real.



## 🧠 Por que isso importa (a parte "segurança da informação" do projeto)

| Conceito | Onde aparece no código |
|---|---|
| Modelagem de força de senha com algoritmo validado (zxcvbn-ts) | `src/lib/analyze.js` |
| K-anonimato (privacidade em consultas) | `src/lib/pwnedCheck.js` |
| CSPRNG vs PRNG comum | `src/lib/generate.js` |
| Trade-off memorabilidade × entropia real (senha derivada de frase) | `src/lib/generateFromPhrase.js` |
| Rate limiting contra abuso | `server/src/middleware/rateLimiter.js` |
| Logs de segurança sem violar privacidade (hash de IP com salt) | `server/src/utils/hashIp.js` |
| Observabilidade com custo de leitura O(1) em escala | `server/src/services/logger.js` |
| Retenção de dados com expiração automática (TTL) | `server/src/services/logger.js`, [PRIVACY.md](./PRIVACY.md) |
| Cabeçalhos de segurança HTTP (CSP, X-Frame-Options etc.) | `netlify.toml` |
| Escalabilidade horizontal do rate limiting (Redis opcional) | `server/src/services/redis.js` |
| Escaneamento de segredos vazados a cada push | `.github/workflows/ci.yml` (job `secret-scan`) |
| Modelagem de ameaças documentada | [THREAT_MODEL.md](./THREAT_MODEL.md) |
| Política de divulgação responsável de vulnerabilidades | [SECURITY.md](./SECURITY.md) |
| Superfície de ataque mínima (backend não guarda senha nenhuma) | arquitetura geral |

## 🛠️ Stack técnica

- React 19 + Vite + Tailwind CSS 4
- Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`)
- [`@zxcvbn-ts/core`](https://github.com/zxcvbn-ts/zxcvbn) para análise de
  força de senha — o mesmo algoritmo (mantido e modernizado a partir do
  zxcvbn original do Dropbox) usado por produtos reais, com dicionário em
  português brasileiro. Carregado sob demanda via `import()` dinâmico, para
  não inflar o carregamento inicial da página com os dicionários.
- Node.js + Express no backend, com `helmet`, `cors`, `express-rate-limit`
  e `firebase-admin`

## ✅ Qualidade e operação

- **Testes automatizados**: 32 no frontend + 21 no backend (`npm test` em
  cada pacote), incluindo testes de integração HTTP reais via `supertest`,
  um teste estatístico que valida a ausência de viés no gerador de senha, e
  testes E2E com Playwright (`npm run test:e2e`) exercitando a interface
  num navegador real.
- **CI**: workflow do GitHub Actions (`.github/workflows/ci.yml`) rodando
  escaneamento de segredos (gitleaks), testes, build, testes E2E e
  `npm audit` a cada push — veja a nota sobre onde colocar esse arquivo no
  próprio workflow.
- **Dependabot**: atualização semanal de dependências configurada
  (`.github/dependabot.yml`).
- **Cabeçalhos de segurança**: CSP, `X-Frame-Options`, `Referrer-Policy` e
  `Permissions-Policy` configurados via `netlify.toml`.
- **Privacidade**: política documentada em [PRIVACY.md](./PRIVACY.md),
  com retenção automática de 90 dias para os logs via TTL do Firestore.
- **Modelo de ameaças e política de segurança**: documentados em
  [THREAT_MODEL.md](./THREAT_MODEL.md) e [SECURITY.md](./SECURITY.md).
- **Rate limiting escalável**: suporte opcional a Redis para funcionar
  corretamente com múltiplas instâncias do backend (ver
  `server/README.md`).
- **Monitoramento**: instruções para configurar uptime-check gratuito
  documentadas em `server/README.md`.

## 🚀 Rodando localmente

**Frontend:**

```bash
npm install
cp .env.example .env    # ajuste se necessário
npm run dev
```

Abra `http://localhost:5173`.

**Backend** (em outro terminal):

```bash
cd server
npm install
cp .env.example .env    # funciona com os padrões para desenvolvimento local
npm run dev
```

Sobe em `http://localhost:3001`. Sem isso rodando, a aba "Analisar" ainda
funciona (cálculo de entropia é local), só a verificação de vazamento fica
indisponível.

Build de produção do frontend:

```bash
npm run build
npm run preview
```

Testes (cada pacote tem sua própria suíte):

```bash
npm test              # frontend — inclui o teste de viés do CSPRNG
cd server && npm test # backend — inclui teste real de rate limiting via HTTP
```

Testes E2E (Playwright, abre um navegador real e testa a interface):

```bash
npx playwright install  # baixa o navegador (só na primeira vez)
npm run test:e2e
```

## ☁️ Deploy

**Frontend** — build estático (`npm run build` → `dist/`):

- **Netlify**: comando de build `npm run build`, diretório de publicação
  `dist`. Configure a variável de ambiente `VITE_API_BASE_URL` apontando
  para a URL do backend publicado.

**Backend** — precisa de um processo Node rodando (não é estático):

- **Railway**: conecte o repositório, defina o diretório raiz como
  `server`, configure as variáveis de ambiente (`ALLOWED_ORIGIN`,
  `IP_HASH_SALT`, `FIREBASE_SERVICE_ACCOUNT`).
- **Oracle Cloud Free Tier**: suba a pasta `server`, rode `npm install &&
  npm start` (idealmente atrás de um gerenciador de processo como `pm2`) e
  configure um proxy reverso (Nginx) com HTTPS na frente.

**Firestore** (opcional, para logs/estatísticas): crie um projeto no
[Firebase Console](https://console.firebase.google.com/), ative o
Firestore, gere uma chave de service account em *Configurações do projeto
→ Contas de serviço* e cole o JSON gerado na variável
`FIREBASE_SERVICE_ACCOUNT`.

## ⚠️ Avisos importantes

Este projeto nasceu como estudo e continua rotulado como tal — mas vale
separar o que isso significa exatamente, porque nem tudo aqui é "de
brincadeira":

- **O que já é de nível de produção**: geração de senha (CSPRNG com
  rejection sampling), verificação de vazamento (k-anonimato correto),
  análise de força (zxcvbn-ts, o mesmo algoritmo usado por produtos reais),
  backend com rate limiting, logs privacy-safe com retenção automática, CI
  com testes e auditoria de dependência, e cabeçalhos de segurança HTTP.
  Nenhum desses pontos tem uma ressalva de "não confie nisso de verdade".
- **O que continua sendo uma estimativa, por natureza**: qualquer "tempo
  de quebra" — inclusive o do zxcvbn — depende de um cenário assumido de
  ataque (aqui, hash rápido offline a ~10¹⁰ tentativas/segundo). Sistemas
  reais que usam `bcrypt`/`argon2` corretamente são ordens de magnitude
  mais resistentes que esse cenário. Isso não é uma limitação deste
  projeto especificamente — é assim que toda estimativa de força de senha
  funciona, em qualquer produto.
- A consulta ao Have I Been Pwned depende de um serviço de terceiros (agora
  repassada pelo backend próprio); se a API estiver fora do ar, a
  verificação simplesmente informa a falha.
- O backend nunca recebe senha nem hash completo — só o prefixo de 5
  caracteres, que já é insuficiente para identificar a senha original por
  design do próprio modelo de k-anonimato.
- O `npm audit` do backend aponta vulnerabilidades de severidade
  **moderada** (não alta/crítica) em dependências transitivas do
  `firebase-admin`, fora do controle direto deste projeto — o CI está
  configurado para falhar apenas acima do nível "high", e o Dependabot
  avisa automaticamente quando isso mudar.
- Nunca reutilize senhas reais em ambientes de teste ou demonstrações
  públicas deste projeto.

## 📄 Licença

MIT — veja [LICENSE](./LICENSE).

---

<a name="english"></a>
## English

Password strength checker and generator, built as a security portfolio
project. The frontend does all sensitive work locally (entropy calculation,
password generation, hashing); a lightweight Node/Express backend acts only
as a proxy and observability layer — it never sees the password or the full
hash, only the 5-character k-anonymity prefix.

**Features:** password strength analysis via [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn)
(the same class of algorithm used by real security products, with a
Brazilian Portuguese dictionary, lazy-loaded to keep the initial bundle
small), breach checking against Have I Been Pwned via the k-anonymity model
(through our own backend proxy), a CSPRNG-based generator
(`crypto.getRandomValues`, with rejection sampling to avoid modulo bias), a
phrase-to-password generator, a show/hide toggle for generated passwords,
rate limiting (30 requests/15min per IP), and privacy-conscious security
logging (IP hashed with salt, 90-day automatic retention via Firestore TTL)
— see [PRIVACY.md](./PRIVACY.md).

**Stack:** React 19, Vite, Tailwind CSS 4, Web Crypto API on the frontend;
Node.js, Express, Firestore on the backend.

**Quality & operations:** 28 frontend + 19 backend automated tests
(including real HTTP integration tests and a statistical bias check on the
generator), GitHub Actions CI running tests/build/`npm audit` on every
push, Dependabot for weekly dependency updates, and HTTP security headers
(CSP, X-Frame-Options, etc.) via `netlify.toml`.

**Run locally:** see the Portuguese section above (`Rodando localmente`) —
commands are the same regardless of language.

**Deploy:** static frontend build (`npm run build` → `dist/`) on Netlify or
similar; the backend needs a long-running Node process (Railway, Oracle
Cloud Free Tier, etc.) since it isn't a static site.

**Disclaimer:** still labeled a study/portfolio project, but most of it is
production-grade (see the "Avisos importantes" section above for the exact
breakdown). Crack-time estimates always assume an attack scenario (here,
offline fast hashing) — that's inherent to any such estimate, not specific
to this tool. Don't reuse real passwords in public demos of this tool.

License: MIT.
