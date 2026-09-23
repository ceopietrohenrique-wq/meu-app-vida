import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema Operacional da Minha Vida",
    short_name: "Minha Vida",
    description:
      "App pessoal para rotina, hábitos, metas, saúde, finanças e negócios.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // O mesmo ícone de 512 já respeita a "safe zone" de maskable (glifo
      // centralizado, bem dentro do círculo de 80% que o SO usa ao
      // recortar) — reaproveitado como entrada dedicada de purpose
      // "maskable" em vez de gerar um ícone extra só para isso (Fase 8 >
      // Ícones: "não criar dezenas de splash/ícones sem necessidade").
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
