import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Este projeto é um monorepo simples (frontend na raiz, backend em
    // server/), cada um com seu próprio package.json e testes. Sem isso, o
    // Vitest da raiz também executaria os testes do backend.
    exclude: ["**/node_modules/**", "server/**"],
  },
})
