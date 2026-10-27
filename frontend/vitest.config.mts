import path from "node:path";
import { defineConfig } from "vitest/config";

// Testes unitários das regras puras (domínio, validação, sessão, mensagens). Rodam em Node, sem
// navegador: componentes e integração com a API são verificados no fluxo ponta a ponta.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
