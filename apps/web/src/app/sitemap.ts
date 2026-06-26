import type { MetadataRoute } from "next";

import { siteUrl } from "@/shared/lib/site";

const routes = ["/", "/metodologia", "/deputados", "/proposicoes", "/matcher"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
  }));
}
