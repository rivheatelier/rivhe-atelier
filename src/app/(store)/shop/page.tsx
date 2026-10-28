import type { Metadata } from "next";
import Link from "next/link";
import { CurrencySwitch } from "@/components/currency-select";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES, categoryHref, findCategory } from "@/lib/categories";
import { getCurrency } from "@/lib/currency-server";
import { listStoreProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop",
  description: "One-of-a-kind handmade crochet bags and accessories.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pick = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const q = pick("q")?.slice(0, 60).trim() || undefined;
  const category = findCategory(pick("category"));
  const availableOnly = pick("available") === "1";

  const [products, currency] = await Promise.all([
    listStoreProducts({ q, category: category?.label, availableOnly }),
    getCurrency(),
  ]);

  const title = q ? `Results for “${q}”` : (category?.label ?? (availableOnly ? "Available now" : "Shop all"));
  // Every category is always listed, so buyers see the whole range even before each one has pieces.
  const filters = [
    { label: "All", href: "/shop", active: !category && !availableOnly && !q },
    { label: "Available now", href: "/shop?available=1", active: availableOnly && !category },
    ...CATEGORIES.map((c) => ({ label: c.label, href: categoryHref(c), active: category?.slug === c.slug })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 lg:pt-14">
      <div className="text-center">
        <h1 className="font-serif text-[34px] leading-tight sm:text-[42px]">{title}</h1>
        <p className="mt-2 text-[13px] text-muted">
          {products.length} {products.length === 1 ? "piece" : "pieces"} · each one of a kind
        </p>
        <CurrencySwitch value={currency.code} options={currency.options} className="mt-5" />
      </div>

      <nav className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:justify-center sm:px-0" aria-label="Filter">
        {filters.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[12px] tracking-[0.06em] transition-colors",
              f.active ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {products.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} currency={currency} preload={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-line py-20 text-center">
          <p className="text-[14px] text-ink-2">{q ? "Nothing matches that search." : "No pieces here yet."}</p>
          <Link href="/shop" className="link-underline mt-3 inline-block text-[13px]">
            See all pieces
          </Link>
        </div>
      )}
    </div>
  );
}
