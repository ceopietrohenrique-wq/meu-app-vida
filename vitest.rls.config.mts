import { defineConfig } from "vitest/config";

/**
 * Config separada dos testes de RLS: rodam contra um Supabase real (local
 * ou remoto), não em jsdom, e não fazem parte do `npm test` padrão (que
 * precisa continuar rápido e hermético para o CI). Rodar com
 * `npm run test:rls`.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./supabase/tests/setup.ts"],
    include: ["supabase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
