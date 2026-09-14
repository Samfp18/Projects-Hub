# Motor Universal V0.1

Motor de simulação narrativa: você descreve um mundo em texto livre, uma IA (DeepSeek) extrai cenário, protagonista, NPCs e facções, e narra a história turno a turno a partir das suas ordens.

Stack: React + TypeScript + Vite. Mapa via Leaflet/OpenStreetMap. Chamadas à DeepSeek passam por uma Netlify Function, que guarda a chave no servidor.

## Rodando localmente

Precisa da [Netlify CLI](https://docs.netlify.com/cli/get-started/) instalada (`npm install -g netlify-cli`), porque o app depende da function em `netlify/functions/deepseek.ts`.

```bash
npm install
cp .env.example .env      # preencha DEEPSEEK_API_KEY=sua-chave
netlify dev
```

Isso sobe o Vite e emula a function juntos em `http://localhost:8888`.

Rodar só `npm run dev` (sem Netlify CLI) funciona para navegar pela interface, mas qualquer ação que chame a IA vai falhar, pois a function não estará disponível.

## Build de produção

```bash
npm run build
```

Gera a pasta `dist/` com os arquivos estáticos.

## Deploy no Netlify

Este projeto vive dentro de um monorepo (`web/motor-universal`). Ao conectar o repositório no Netlify:

1. **Add new site → Import an existing project** → escolha o repositório.
2. Configurações de build:
   - **Base directory:** `web/motor-universal`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Em **Site settings → Environment variables**, cadastre `DEEPSEEK_API_KEY` com sua chave real.
4. Deploy.

A partir daí, qualquer push na pasta `web/motor-universal` dispara um novo deploy automático.
