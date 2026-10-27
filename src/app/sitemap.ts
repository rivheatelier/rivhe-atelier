import type { MetadataRoute } from "next";
import { EDITABLE_PAGES } from "@/lib/pages";
import { listStoreProducts } from "@/lib/products";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await listStoreProducts().catch(() => []);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ...EDITABLE_PAGES.map((slug) => ({ url: `${base}/${slug}`, priority: 0.4 })),
    { url: `${base}/contact`, priority: 0.4 },
  ];
}
