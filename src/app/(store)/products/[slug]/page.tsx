import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion } from "@/components/accordion";
import { AddToCart } from "@/components/add-to-cart";
import { CurrencySwitch } from "@/components/currency-select";
import { MadeByHand } from "@/components/made-by-hand";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { getCartIds } from "@/lib/cart";
import { formatIDR, formatPrice, formatUSD, idrFromUsd } from "@/lib/currency";
import { getCurrency } from "@/lib/currency-server";
import { getProductBySlug, listRelated } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, images: product.images.slice(0, 1).map((url) => absoluteUrl(url)) },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, currency, settings, cartIds] = await Promise.all([
    getProductBySlug(slug),
    getCurrency(),
    getSettings(),
    getCartIds(),
  ]);
  if (!product) notFound();
  const related = await listRelated(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((url) => absoluteUrl(url)),
    brand: { "@type": "Brand", name: "RIVHÉ Atelier" },
    offers: {
      "@type": "Offer",
      price: product.priceUsd,
      priceCurrency: "USD",
      availability: product.status === "available" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: absoluteUrl(`/products/${product.slug}`),
    },
  };

  return (
    <>
      <div className="mx-auto max-w-7xl lg:px-8 lg:pt-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12 xl:gap-16">
          <ProductGallery images={product.images} name={product.name} />

          <div className="px-5 pt-7 sm:px-8 lg:px-0 lg:pt-2">
            <div className="lg:sticky lg:top-28">
              {product.category && <p className="eyebrow text-muted">{product.category}</p>}
              <h1 className="mt-2 font-serif text-[32px] leading-[1.1] sm:text-[38px]">{product.name}</h1>

              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="font-serif text-[24px]">{formatPrice(product.priceUsd, currency)}</p>
                <CurrencySwitch value={currency.code} options={currency.options} />
              </div>
              <p className="mt-1 text-[12px] text-muted">
                {currency.code === "USD"
                  ? `≈ ${formatIDR(idrFromUsd(product.priceUsd, currency.rate))} at today’s rate · paid in IDR by bank transfer`
                  : `${formatUSD(product.priceUsd)} at today’s rate of ${formatIDR(Math.round(currency.rate))} per US$`}
              </p>

              <div className="mt-7">
                <AddToCart
                  productId={product.id}
                  status={product.status}
                  inCart={cartIds.includes(product.id)}
                  reservationHours={settings.reservationHours}
                />
              </div>

              {product.description && (
                <p className="mt-7 text-[14px] leading-[1.85] whitespace-pre-line text-ink-2">{product.description}</p>
              )}

              {product.story && (
                <div className="mt-7">
                  <h2 className="eyebrow text-muted">The story</h2>
                  <p className="mt-2 text-[14px] leading-[1.85] whitespace-pre-line text-ink-2">{product.story}</p>
                </div>
              )}

              <div className="mt-7 border-t border-line">
                <Accordion title="Details" defaultOpen>
                  <ul className="list-disc space-y-1 pl-4 marker:text-muted">
                    {product.details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    <li>One of a kind — once it’s gone, it’s gone</li>
                  </ul>
                </Accordion>
                <Accordion title="Shipping">
                  <p>{settings.shippingNote}</p>
                  <Link href="/shipping-returns" className="link-underline mt-2 inline-block text-ink">
                    Shipping & returns
                  </Link>
                </Accordion>
                <Accordion title="Care">
                  <p>{settings.careNote}</p>
                  <Link href="/care" className="link-underline mt-2 inline-block text-ink">
                    Care guide
                  </Link>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MadeByHand image={product.images[0]} />

      {related.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-5 sm:px-8">
          <h2 className="eyebrow mb-6">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} />
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
