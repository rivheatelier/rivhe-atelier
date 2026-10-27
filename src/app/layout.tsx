import type { Metadata, Viewport } from "next";
import { Allura, Cormorant_Garamond, Jost } from "next/font/google";
import { siteUrl } from "@/lib/site";
import { getTheme } from "@/lib/theme-server";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const sans = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });
const script = Allura({ subsets: ["latin"], weight: "400", variable: "--font-allura", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "RIVHÉ Atelier — Handmade crochet goods", template: "%s — RIVHÉ Atelier" },
  description:
    "One-of-a-kind crochet bags and accessories, handmade in Indonesia. Every stitch tells a different story.",
  openGraph: { siteName: "RIVHÉ Atelier", type: "website", locale: "en_US" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#161412" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Rendered on the server from the cookie, so pages never flash the wrong theme.
  const theme = await getTheme();
  return (
    // Browsers and extensions (Chrome on iOS, Bitdefender…) add their own attributes to these
    // two elements before React loads; ignore those differences only here.
    <html
      lang="en"
      data-theme={theme}
      className={`${serif.variable} ${sans.variable} ${script.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-svh font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
