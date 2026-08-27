// Sem este arquivo, o Vitest — quando rodado de dentro de server/ sem
// nenhum vite.config/vitest.config próprio — sobe um nível de pasta e
// acaba carregando o vite.config.js do FRONTEND por engano, que importa
// plugins (vite, @vitejs/plugin-react, @tailwindcss/vite) inexistentes no
// node_modules do backend. Isso só aparece quando as duas pastas são
// instaladas de forma isolada uma da outra — como acontece no CI, onde
// cada job do GitHub Actions só instala as dependências da sua própria
// pasta (ver .github/workflows/ci.yml).
export default {
  test: {
    environment: "node",
  },
};
