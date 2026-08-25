# 🔐 Cofre de Senhas

> Verificador e gerador de senhas seguras — 100% client-side, sem backend, sem coleta de dados.

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
- **Verificação de vazamento**: consulta a API pública do Have I Been Pwned
  usando o modelo de **k-anonimato**: apenas os 5 primeiros caracteres do
  hash SHA-1 da senha são enviados pela rede. A senha em texto puro nunca sai
  do navegador.
- **Gerador seguro**: usa `crypto.getRandomValues` (CSPRNG do navegador) com
  *rejection sampling* para evitar viés estatístico — nunca `Math.random()`.
- **Gerador a partir de frase**: transforma uma frase memorável em senha
  (leetspeak configurável, capitalização aleatória, preenchimento opcional
  com caracteres aleatórios). Deixa claro na interface que essa senha é
  menos imprevisível que uma totalmente aleatória do mesmo tamanho.
- **100% client-side**: não existe backend, banco de dados ou telemetria.
  Tudo roda no navegador do usuário.

## 🧠 Por que isso importa (a parte "segurança da informação" do projeto)

| Conceito | Onde aparece no código |
|---|---|
| Entropia de senha | `src/lib/analyze.js` |
| K-anonimato (privacidade em consultas) | `src/lib/pwnedCheck.js` |
| CSPRNG vs PRNG comum | `src/lib/generate.js` |
| Trade-off memorabilidade × entropia real (senha derivada de frase) | `src/lib/generateFromPhrase.js` |
| Superfície de ataque mínima (sem backend) | arquitetura geral |

## 🛠️ Stack técnica

- React 19 + Vite
- Tailwind CSS 4
- Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`)
- Zero dependências de terceiros para a lógica de segurança (a análise de
  força é implementada do zero, sem `zxcvbn` ou libs equivalentes)

## 🚀 Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Build de produção:

```bash
npm run build
npm run preview
```

Testes (inclui verificação de viés estatístico do gerador de senhas — o
rejection sampling sobre `crypto.getRandomValues` precisa distribuir
caracteres de forma uniforme, sem favorecer os primeiros do alfabeto):

```bash
npm test
```

## ☁️ Deploy

O projeto gera um site estático puro (`npm run build` → pasta `dist/`), então
funciona em qualquer host estático:

- **Netlify**: conecte o repositório, comando de build `npm run build`,
  diretório de publicação `dist`.
- **Vercel / GitHub Pages / Cloudflare Pages**: mesma configuração.

Não há variáveis de ambiente nem backend a configurar.

## ⚠️ Avisos importantes

- Este é um projeto **educacional**. As estimativas de "tempo de quebra"
  assumem um cenário de ataque offline contra um hash rápido — sistemas reais
  que usam `bcrypt`/`argon2` corretamente são muito mais resistentes.
- A consulta ao Have I Been Pwned depende de um serviço de terceiros; se a
  API estiver fora do ar, a verificação simplesmente informa a falha.
- Nunca reutilize senhas reais em ambientes de teste ou demonstrações
  públicas deste projeto.

## 📄 Licença

MIT — veja [LICENSE](./LICENSE).

---

<a name="english"></a>
## English

Client-side password strength checker and generator, built as a security
portfolio project. No backend, no data collection.

**Features:** real entropy calculation with pattern detection (common
passwords, keyboard sequences, repeated characters), breach checking against
Have I Been Pwned using the k-anonymity model (only the first 5 characters of
the password's SHA-1 hash ever leave the browser), and a CSPRNG-based
generator (`crypto.getRandomValues`, with rejection sampling to avoid modulo
bias — never `Math.random()`).

**Stack:** React 19, Vite, Tailwind CSS 4, Web Crypto API. No third-party
password-scoring library — the strength analysis is implemented from
scratch so the security reasoning is fully inspectable.

**Run locally:**

```bash
npm install
npm run dev
```

**Deploy:** static build (`npm run build` → `dist/`), works on Netlify,
Vercel, GitHub Pages, or any static host — no environment variables needed.

**Disclaimer:** educational project. Crack-time estimates assume an offline
attack against a fast hash; real systems using `bcrypt`/`argon2` properly are
far more resistant. Don't reuse real passwords in public demos of this tool.

License: MIT.
