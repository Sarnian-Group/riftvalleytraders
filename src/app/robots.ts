import type { MetadataRoute } from "next";

// Static on purpose: served the same under `output: export` and on the Netlify runtime.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [] }],
    sitemap: "https://riftvalleytraders.co/sitemap.xml",
  };
}
