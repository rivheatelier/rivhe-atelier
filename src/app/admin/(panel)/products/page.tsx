import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Banner, PageTitle, ProductBadge } from "@/components/admin/ui";
import { IconPlus } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { formatIDR, formatUSD, idrFromUsd } from "@/lib/currency";
import { getUsdRate } from "@/lib/exchange-rate";
import { adminCountProducts, adminListProducts, releaseExpiredOrders, type ProductStatus } from "@/lib/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const TABS: { key: ProductStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "reserved", label: "Reserved" },
  { key: "sold", label: "Sold" },
  { key: "draft", label: "Drafts" },
];

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ status?: string; deleted?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const tab = TABS.find((t) => t.key === params.status) ?? TABS[0];
  await releaseExpiredOrders();
  const [products, counts, { rate }] = await Promise.all([
    adminListProducts(tab.key === "all" ? undefined : tab.key),
    adminCountProducts(),
    getUsdRate(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageTitle
        title="Products"
        subtitle="One piece per colour and model. Sold pieces stay visible as “Sold out”."
        action={
          <Link href="/admin/products/new" className="btn-primary h-10 shrink-0 px-4 text-[12px]">
            <IconPlus className="h-4 w-4" /> New
          </Link>
        }
      />
      {params.deleted && <Banner>Piece deleted.</Banner>}

      <nav className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter products">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/admin/products" : `/admin/products?status=${t.key}`}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
              t.key === tab.key ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-ink/40",
            )}
          >
            {t.label} <span className={t.key === tab.key ? "text-paper/60" : "text-muted"}>{t.key === "all" ? total : counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      {products.length > 0 ? (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/products/${product.id}`}
                className="flex items-center gap-3 rounded-[4px] border border-line bg-surface p-3 transition-colors hover:border-ink/30"
              >
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-[2px] bg-cream">
                  {product.images[0] && <Image src={product.images[0]} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-ink">{product.name}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {formatUSD(product.priceUsd)} <span className="text-muted">· ≈ {formatIDR(idrFromUsd(product.priceUsd, rate))}</span>
                  </p>
                  {product.category && <p className="text-[12px] text-muted">{product.category}</p>}
                </div>
                <ProductBadge status={product.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[4px] border border-dashed border-line px-4 py-14 text-center">
          <p className="text-[13px] text-muted">Nothing here yet.</p>
          <Link href="/admin/products/new" className="link-underline mt-2 inline-block text-[13px]">
            Add your first piece
          </Link>
        </div>
      )}
    </>
  );
}
