import type { Metadata } from "next";
import PageviewTracker from "@/components/analytics/PageviewTracker";
import { ConsentTag } from "@/components/analytics/ConsentTag";
import "./globals.css";

const TRACKED_HOSTNAMES = ["riftvalleytraders.co", "www.riftvalleytraders.co"];

// GA4 (cookieless until accepted) and the LeadLens visitor pixel (only after
// accepting), behind one notice — see components/analytics/ConsentTag.tsx.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-9GD6Z8HNR6";
const LEADLENS_SITE_ID = process.env.NEXT_PUBLIC_LEADLENS_SITE_ID || "e215d503-ae91-407c-85dc-d5eac589dcf8";

export const metadata: Metadata = {
  metadataBase: new URL("https://riftvalleytraders.co"),
  verification: { google: "IJV1i67ECERi-dCVwaKH05_cyhg1vW1gr7FvXzT79lA" },
  title: "Rift Valley Traders | African Specialty & Commodity Trade",
  description:
    "Connecting global markets with Africa's finest commodities since 1987. Single-origin coffee, spices, and heritage goods for discerning buyers, plus bulk grain, sugar, and commodity trade at scale.",
  keywords: [
    "African commodities",
    "premium coffee",
    "Ethiopian coffee",
    "Kenyan coffee",
    "rare spices",
    "heritage grains",
    "bulk grain trade",
    "commodity trading",
    "wheat maize rice supply",
    "sugar trade",
    "cotton cocoa cashew",
    "direct trade",
    "sustainable sourcing",
    "East Africa trade",
  ],
  authors: [{ name: "Rift Valley Traders" }],
  openGraph: {
    title: "Rift Valley Traders | African Specialty & Commodity Trade",
    description:
      "Single-origin specialty goods for discerning buyers, plus bulk grain and commodity trade at scale — sourced from the heart of the Rift Valley.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <PageviewTracker site="riftvalley" hostnames={TRACKED_HOSTNAMES} />
        <ConsentTag
          ga={GA_ID}
          leadlensSiteId={LEADLENS_SITE_ID}
          hostnames={[...TRACKED_HOSTNAMES, "riftvalleytraders.netlify.app"]}
          storageKey="riftvalley.consent"
          reopenEvent="riftvalley:consent-choices"
        />
      </body>
    </html>
  );
}
