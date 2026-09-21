import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que o Turbopack suba a árvore de diretórios e encontre um
  // package-lock.json solto fora deste repositório (ex.: na pasta do
  // usuário), o que faria ele inferir a raiz do monorepo incorretamente.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
