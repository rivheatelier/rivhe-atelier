import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Currency } from "@/lib/currency";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ProductCard({ product, currency, preload = false }: { product: Product; currency: Currency; preload?: boolean }) {
  const [cover, hover] = product.images;
  const unavailable = product.status !== "available";

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {cover && (
          <Image
            src={cover}
            alt={product.name}
            fill
            preload={preload}
            sizes="(min-width: 1024px) 25vw, 50vw"
            className={cn(
              "object-cover transition duration-700 ease-out group-hover:scale-[1.03]",
              hover && "group-hover:opacity-0",
              product.status === "sold" && "opacity-75",
            )}
          />
        )}
        {hover && (
          <Image
            src={hover}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
          />
        )}
        {unavailable && (
          <span className="absolute top-2.5 left-2.5 bg-paper/90 px-2 py-1 text-[10px] tracking-[0.16em] text-ink-2 uppercase">
            {product.status === "sold" ? "Sold out" : "Reserved"}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-0.5 text-[13px] leading-snug">
        <p className="text-ink">{product.name}</p>
        <p className={cn(unavailable ? "text-muted" : "text-ink-2")}>{formatPrice(product.priceUsd, currency)}</p>
      </div>
    </Link>
  );
}
