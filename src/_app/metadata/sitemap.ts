import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/shared/config/index.server";

function buildSitemap(origin = getSiteOrigin()): MetadataRoute.Sitemap {
  return [
    { changeFrequency: "weekly", priority: 1, url: `${origin}/` },
    { changeFrequency: "yearly", priority: 0.3, url: `${origin}/terms` },
    { changeFrequency: "yearly", priority: 0.3, url: `${origin}/privacy` },
  ];
}

export { buildSitemap, buildSitemap as sitemap };
