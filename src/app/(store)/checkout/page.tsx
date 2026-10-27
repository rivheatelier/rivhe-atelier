import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCart } from "@/lib/cart";
import { countryList } from "@/lib/countries";
import { getCurrency } from "@/lib/currency-server";
import { getSettings } from "@/lib/settings";
import { CheckoutFlow } from "./checkout-flow";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, currency, settings] = await Promise.all([getCart(), getCurrency(), getSettings()]);

  if (cart.items.length === 0 || cart.purchasable.length !== cart.items.length) {
    const empty = cart.items.length === 0;
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-serif text-[32px]">{empty ? "Your cart is empty" : "Your cart has changed"}</h1>
        <p className="mt-3 text-[14px] text-ink-2">
          {empty ? "Find a piece you love first." : "A piece in your cart is no longer available. Please review your cart."}
        </p>
        <Link href={empty ? "/shop" : "/cart"} className="btn-primary mt-8 px-10">
          {empty ? "Shop all pieces" : "Review cart"}
        </Link>
      </div>
    );
  }

  return (
    <Suspense>
      <CheckoutFlow
        items={cart.purchasable.map((p) => ({ id: p.id, name: p.name, priceUsd: p.priceUsd, image: p.images[0] ?? null }))}
        currency={{ code: currency.code, rate: currency.rate }}
        bank={{ name: settings.bankName, accountNumber: settings.bankAccountNumber, accountName: settings.bankAccountName }}
        paymentSuffix={settings.paymentSuffix}
        reservationHours={settings.reservationHours}
        countries={countryList(settings.internationalShipping)}
        cartKey={cart.purchasable
          .map((p) => p.id)
          .sort()
          .join(",")}
      />
    </Suspense>
  );
}
