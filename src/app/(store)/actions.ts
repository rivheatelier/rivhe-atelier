"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { verifyCaptcha } from "@/lib/captcha";
import { getCart, getCartIds, setCartIds } from "@/lib/cart";
import { isShippableCountry } from "@/lib/countries";
import { idrFromUsd, isCurrencyCode } from "@/lib/currency";
import { CURRENCY_COOKIE, getCurrency } from "@/lib/currency-server";
import { getUsdRate } from "@/lib/exchange-rate";
import { notifyOrderPlaced } from "@/lib/notify";
import { findOrderByCodeAndEmail, OrderError, placeOrder } from "@/lib/orders";
import { getProductsByIds } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { getShippingOptions, signOptions, verifyQuote } from "@/lib/shipping";
import type { ShippingSource, SignedShippingOption } from "@/lib/shipping-types";
import { whatsappLink } from "@/lib/utils";
import { normalizeAddress, validateAddress, type AddressInput } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setCurrencyAction(code: string): Promise<void> {
  if (!isCurrencyCode(code)) return;
  (await cookies()).set(CURRENCY_COOKIE, code, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function addToCartAction(productId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID.test(productId)) return { ok: false, error: "This piece is no longer listed." };
  const [product] = await getProductsByIds([productId]);
  if (!product || product.status === "draft") return { ok: false, error: "This piece is no longer listed." };
  if (product.status !== "available") return { ok: false, error: "Sorry — someone has just reserved this piece." };
  const ids = await getCartIds();
  if (!ids.includes(productId)) await setCartIds([...ids, productId]);
  return { ok: true };
}

export async function removeFromCartAction(productId: string): Promise<void> {
  const ids = await getCartIds();
  await setCartIds(ids.filter((id) => id !== productId));
}

export type QuoteResult =
  /** `usdRate` (Rupiah per US dollar) is locked into every option's token. */
  | { ok: true; options: SignedShippingOption[]; source: ShippingSource; usdRate: number }
  | { ok: false; error: string };

export async function quoteShippingAction(input: { country: string; postalCode: string }): Promise<QuoteResult> {
  const country = String(input.country ?? "").toUpperCase();
  const postalCode = String(input.postalCode ?? "").trim().toUpperCase();
  const [cart, settings, { rate: usdRate }] = await Promise.all([getCart(), getSettings(), getUsdRate()]);

  if (cart.items.length === 0 || cart.purchasable.length !== cart.items.length) {
    return { ok: false, error: "Your cart has changed. Please review it before checking out." };
  }
  if (country !== "ID" && (!settings.internationalShipping || !isShippableCountry(country))) {
    return { ok: false, error: "Sorry, we don’t ship to this country yet." };
  }
  if (country === "ID" && !/^\d{5}$/.test(postalCode)) return { ok: false, error: "Enter a 5-digit postal code." };

  const valueIdr = cart.purchasable.reduce((sum, p) => sum + idrFromUsd(p.priceUsd, usdRate), 0);
  const { options, source } = await getShippingOptions({ country, postalCode, weightGrams: cart.weightGrams, valueIdr }, settings);
  if (options.length === 0) {
    return { ok: false, error: "We couldn’t find a shipping option for this address. Please check it, or contact us." };
  }
  return {
    ok: true,
    source,
    usdRate,
    options: signOptions(options, { country, postalCode, cartIds: cart.purchasable.map((p) => p.id), usdRate }),
  };
}

/** `requote`: the shipping quote expired or no longer matches the address/cart, so a fresh one is needed. */
export type PlaceOrderResult = { ok: false; error: string; unavailable?: boolean; requote?: boolean };

/** Re-validates everything on the server, reserves the pieces atomically, then redirects to the thank-you page. */
export async function placeOrderAction(input: { address: Partial<AddressInput>; quoteToken: string }): Promise<PlaceOrderResult> {
  const address = normalizeAddress(input.address ?? {});
  if (Object.keys(validateAddress(address)).length > 0) return { ok: false, error: "Please check your shipping address." };

  const [cart, settings, currency] = await Promise.all([getCart(), getSettings(), getCurrency()]);
  if (cart.items.length === 0) return { ok: false, error: "Your cart is empty." };
  if (cart.purchasable.length !== cart.items.length) {
    return { ok: false, unavailable: true, error: "Sorry — a piece in your cart is no longer available." };
  }

  const quote = verifyQuote(String(input.quoteToken ?? ""), {
    country: address.country,
    postalCode: address.postalCode,
    cartIds: cart.purchasable.map((p) => p.id),
  });
  if (!quote) {
    return { ok: false, requote: true, error: "Your shipping quote has expired. Check your address and continue to get an updated one." };
  }

  let order: { id: string; code: string; accessToken: string };
  try {
    order = await placeOrder({
      // Priced exactly as the buyer saw them, at the rate locked into the quote.
      items: cart.purchasable.map((p) => ({ id: p.id, priceUsd: p.priceUsd, priceIdr: idrFromUsd(p.priceUsd, quote.usdRate) })),
      address,
      shipping: quote.option,
      paymentSuffix: settings.paymentSuffix,
      reservationHours: settings.reservationHours,
      currency: currency.code,
      usdRate: quote.usdRate,
    });
  } catch (error) {
    if (error instanceof OrderError && error.code === "ITEM_UNAVAILABLE") {
      return { ok: false, unavailable: true, error: "Sorry — someone has just reserved a piece in your cart." };
    }
    console.error("[checkout] placing order failed:", error);
    return { ok: false, error: "We couldn’t place your order. Please try again." };
  }

  await setCartIds([]);
  after(() => notifyOrderPlaced(order.id));
  redirect(`/checkout/success?order=${order.code}&t=${order.accessToken}`);
}

export async function trackOrderAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!code || !email) return { error: "Enter your order number and the email you used." };
  // Every lookup costs a freshly solved captcha, so order numbers can't be guessed at speed.
  if (!(await verifyCaptcha(String(formData.get("altcha") ?? "")))) {
    return { error: "The security check didn’t go through. Please try again." };
  }
  const order = await findOrderByCodeAndEmail(code, email);
  if (!order) return { error: "We couldn’t find an order with that number and email." };
  redirect(`/order/${order.code}?t=${order.accessToken}`);
}

/**
 * The wa.me link behind WhatsApp on the Contact page, which leaves the number out so bots
 * collecting phone numbers find nothing there. Each link costs a freshly solved captcha.
 */
export async function revealWhatsappAction(payload: string): Promise<string | null> {
  if (!(await verifyCaptcha(String(payload ?? "")))) return null;
  const { whatsapp } = await getSettings();
  return whatsapp ? whatsappLink(whatsapp, "Hi RIVHÉ Atelier!") : null;
}
