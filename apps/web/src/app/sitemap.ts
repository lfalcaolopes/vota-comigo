import type { MetadataRoute } from "next";

import { buildDeputadoHref, discovery } from "@/shared/deputado";
import { siteUrl } from "@/shared/lib/site";

export const revalidate = 86_400;
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items, lastIngestedAt } = await discovery();
  const lastModified = lastIngestedAt ?? undefined;

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/deputados`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/deputados/diretorio`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/proposicoes`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/matcher`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/metodologia`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...items.map((deputado) => ({
      url: `${siteUrl}${buildDeputadoHref(
        deputado.externalIdDeputado,
        deputado.nomePublico,
      )}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
