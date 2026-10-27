import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { CURRENCIES, isCurrencyCode, type Currency, type CurrencyCode } from "@/lib/currency";
import { getUsdRate } from "@/lib/exchange-rate";

export const CURRENCY_COOKIE = "rivhe_currency";

export type ActiveCurrency = Currency & { options: CurrencyCode[] };

/** USD unless the visitor switched to IDR. Carries the live rate for conversions. */
export const getCurrency = cache(async (): Promise<ActiveCurrency> => {
  const [jar, { rate }] = await Promise.all([cookies(), getUsdRate()]);
  const saved = jar.get(CURRENCY_COOKIE)?.value;
  return { code: isCurrencyCode(saved) ? saved : "USD", rate, options: CURRENCIES };
});
