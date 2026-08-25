# 🔐 Cofre de Senhas

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

- **Análise de força**: calcula entropia real (bits), detecta senhas comuns,
  sequências de teclado, repetições e datas — e estima o tempo de quebra por
  força bruta.
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
- **Backend de apoio**: proxy do Have I Been Pwned com rate limiting (30
  consultas/15min por IP) e logs de segurança agregados no Firestore — sem
  nunca armazenar senha, hash completo ou IP em texto puro.

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



## 🧠 Por que isso importa (a parte "segurança da informação" do projeto)

| Conceito | Onde aparece no código |
|---|---|
| Entropia de senha | `src/lib/analyze.js` |
| K-anonimato (privacidade em consultas) | `src/lib/pwnedCheck.js` |
| CSPRNG vs PRNG comum | `src/lib/generate.js` |
| Trade-off memorabilidade × entropia real (senha derivada de frase) | `src/lib/generateFromPhrase.js` |
| Rate limiting contra abuso | `server/src/middleware/rateLimiter.js` |
| Logs de segurança sem violar privacidade (hash de IP com salt) | `server/src/utils/hashIp.js` |
| Observabilidade com custo de leitura O(1) em escala | `server/src/services/logger.js` |
| Superfície de ataque mínima (sem backend) | arquitetura geral |

## 🛠️ Stack técnica

- React 19 + Vite
- Tailwind CSS 4
- Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`)
- Zero dependências de terceiros para a lógica de segurança (a análise de
  força é implementada do zero, sem `zxcvbn` ou libs equivalentes)

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

- Este é um projeto **educacional**. As estimativas de "tempo de quebra"
  assumem um cenário de ataque offline contra um hash rápido — sistemas reais
  que usam `bcrypt`/`argon2` corretamente são muito mais resistentes.
- A consulta ao Have I Been Pwned depende de um serviço de terceiros (agora
  repassada pelo backend próprio); se a API estiver fora do ar, a
  verificação simplesmente informa a falha.
- O backend nunca recebe senha nem hash completo — só o prefixo de 5
  caracteres, que já é insuficiente para identificar a senha original por
  design do próprio modelo de k-anonimato.
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

**Features:** real entropy calculation with pattern detection (common
passwords, keyboard sequences, repeated characters), breach checking against
Have I Been Pwned via the k-anonymity model (through our own backend proxy),
a CSPRNG-based generator (`crypto.getRandomValues`, with rejection sampling
to avoid modulo bias), a phrase-to-password generator, rate limiting (30
requests/15min per IP), and privacy-conscious security logging (IP hashed
with salt, never stored in plaintext) via Firestore.

**Stack:** React 19, Vite, Tailwind CSS 4, Web Crypto API on the frontend;
Node.js, Express, Firestore on the backend. No third-party password-scoring
library — the strength analysis is implemented from scratch so the security
reasoning is fully inspectable.

**Run locally:** see the Portuguese section above (`Rodando localmente`) —
commands are the same regardless of language.

**Deploy:** static frontend build (`npm run build` → `dist/`) on Netlify or
similar; the backend needs a long-running Node process (Railway, Oracle
Cloud Free Tier, etc.) since it isn't a static site.

**Disclaimer:** educational project. Crack-time estimates assume an offline
attack against a fast hash; real systems using `bcrypt`/`argon2` properly are
far more resistant. Don't reuse real passwords in public demos of this tool.

License: MIT.
