import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Sem sourcemap em produção: o build minificado (nomes de variável
    // trocados, espaços removidos) já dificulta a leitura casual do código
    // sem impedir a inspeção — inspecionar uma página sempre vai ser
    // possível, é assim que a web funciona. Isso não é "esconder o código",
    // é simplesmente não facilitar de graça, que é a prática padrão em
    // qualquer app em produção.
    sourcemap: false,
  },
  test: {
    // Este projeto é um monorepo simples (frontend na raiz, backend em
    // server/), cada um com seu próprio package.json e testes. Sem isso, o
    // Vitest da raiz também executaria os testes do backend. Os testes E2E
    // (pasta e2e/) rodam com Playwright, não Vitest — também excluídos.
    exclude: ["**/node_modules/**", "server/**", "e2e/**"],
    environment: "jsdom",
  },
})
