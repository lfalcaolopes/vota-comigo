export const SITE_NAME = "Quem Vota Comigo";

export const SITE_DESCRIPTION =
  "Compare suas posições com os votos reais de deputados federais na Câmara dos Deputados, com fonte oficial e método aberto.";

// Override per environment with NEXT_PUBLIC_SITE_URL; the localhost fallback
// only makes the canonical/OG/sitemap URLs correct in local development.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
