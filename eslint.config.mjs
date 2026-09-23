import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      // CLAUDE.md: nunca `any`/`@ts-ignore` para silenciar erro — corrigir o tipo.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": "allow-with-description" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Componentes gerados pelo shadcn/ui — não editar manualmente o estilo.
    "src/shared/components/ui/**",
    "playwright-report/**",
    "coverage/**",
    // Deno runtime (Supabase Edge Functions) — npm:/Deno globals não
    // existem no toolchain Node/Next.js; lint próprio é responsabilidade
    // do `deno lint` no deploy, não deste eslint.
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
