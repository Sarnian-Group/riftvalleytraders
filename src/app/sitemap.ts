import type { MetadataRoute } from "next";

const BASE = "https://riftvalleytraders.co";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}`, lastModified: now, changeFrequency: "monthly" as const, priority: 1.0 },
    { url: `${BASE}/specialty`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/commodities`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
  ];
}
