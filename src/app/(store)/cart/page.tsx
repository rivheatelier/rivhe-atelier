import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CurrencySwitch } from "@/components/currency-select";
import { RemoveFromCart } from "@/components/remove-from-cart";
import { getCart } from "@/lib/cart";
import { displayPrice, formatAmount, formatPrice } from "@/lib/currency";
import { getCurrency } from "@/lib/currency-server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const [cart, currency] = await Promise.all([getCart(), getCurrency()]);
  const blocked = cart.items.some((item) => !item.available);

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 sm:px-8 lg:pt-14">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-tight">Your Cart ({cart.items.length})</h1>
        {cart.items.length > 0 && <CurrencySwitch value={currency.code} options={currency.options} />}
      </div>

      {cart.items.length === 0 ? (
        <div className="mt-8 border-t border-line pt-14 text-center">
          <p className="text-[15px] text-ink-2">Your cart is empty.</p>
          <Link href="/shop" className="btn-primary mt-7 px-10">
            Shop all pieces
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {cart.items.map(({ product, available }) => (
              <li key={product.id} className="flex gap-4 py-5">
                <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden bg-cream sm:w-24">
                  {product.images[0] && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="96px"
                      className={cn("object-cover", !available && "opacity-50 grayscale-[40%]")}
                    />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${product.slug}`} className="text-[15px] text-ink">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-[14px] text-ink-2">{formatPrice(product.priceUsd, currency)}</p>
                    {available ? (
                      <p className="mt-2 text-[12px] text-muted">Qty 1 · one of a kind</p>
                    ) : (
                      <p className="mt-2 text-[12px] text-clay">
                        {product.status === "sold" ? "Sold — no longer available" : "Reserved by another buyer"}
                      </p>
                    )}
                  </div>
                  <RemoveFromCart productId={product.id} name={product.name} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-baseline justify-between font-serif text-[24px]">
            <span>Subtotal</span>
            <span>
              {formatAmount(
                cart.purchasable.reduce((sum, p) => sum + displayPrice(p.priceUsd, currency), 0),
                currency.code,
              )}
            </span>
          </div>
          <p className="mt-2 text-[13px] text-muted">
            Shipping is calculated at checkout.{currency.code !== "IDR" && " Payment is made in Indonesian Rupiah (IDR)."}
          </p>

          {blocked && (
            <p className="mt-5 rounded-[2px] bg-clay-soft px-4 py-3 text-[13px] text-clay">
              Please remove the pieces that are no longer available to continue.
            </p>
          )}

          <div className="mt-8 grid gap-5 text-center">
            {blocked ? (
              <button type="button" disabled className="btn-primary w-full">
                Proceed to Checkout
              </button>
            ) : (
              <Link href="/checkout" className="btn-primary w-full">
                Proceed to Checkout
              </Link>
            )}
            <Link href="/shop" className="link-underline justify-self-center text-[13px]">
              Continue Shopping
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
