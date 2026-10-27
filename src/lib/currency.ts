// Shared by server and client components.
//
// Prices are set in US dollars. Rupiah amounts come from the live USD→IDR rate,
// and bank transfers are always in Rupiah.

export type CurrencyCode = "USD" | "IDR";
export const CURRENCIES: CurrencyCode[] = ["USD", "IDR"];

/** The visitor's display currency, plus the live rate in Rupiah per US dollar. */
export type Currency = { code: CurrencyCode; rate: number };

const META: Record<string, { prefix: string; decimals: number }> = {
  USD: { prefix: "US$", decimals: 2 },
  IDR: { prefix: "IDR", decimals: 0 },
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === "USD" || value === "IDR";
}

/** Formats an amount already in `code`. Whole amounts drop the cents: US$ 45, US$ 45.94. */
export function formatAmount(value: number, code: string): string {
  const meta = META[code] ?? { prefix: code, decimals: 2 };
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  const decimals = whole ? 0 : meta.decimals;
  const number = value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${meta.prefix} ${number}`;
}

export const formatIDR = (amount: number) => formatAmount(amount, "IDR");
export const formatUSD = (amount: number) => formatAmount(amount, "USD");

/**
 * Rupiah for a dollar price at the given rate, rounded to the nearest thousand.
 * The storefront, the checkout and the order all use this, so they always agree.
 */
export function idrFromUsd(usd: number, rate: number): number {
  return Math.round((usd * rate) / 1000) * 1000;
}

/** A Rupiah amount (e.g. shipping) in the display currency. */
export function fromIdr(amountIdr: number, currency: Currency): number {
  return currency.code === "IDR" ? amountIdr : amountIdr / (currency.rate > 0 ? currency.rate : 1);
}

export function formatMoney(amountIdr: number, currency: Currency): string {
  return formatAmount(fromIdr(amountIdr, currency), currency.code);
}

/** A piece's price in the display currency. */
export function displayPrice(priceUsd: number, currency: Currency): number {
  return currency.code === "USD" ? priceUsd : idrFromUsd(priceUsd, currency.rate);
}

export function formatPrice(priceUsd: number, currency: Currency): string {
  return formatAmount(displayPrice(priceUsd, currency), currency.code);
}

/** Replaces the last two digits of a Rupiah total with the payment suffix: 782,000 → 782,017. */
export function transferAmountFor(totalIdr: number, suffix: number): number {
  return Math.floor(totalIdr / 100) * 100 + suffix;
}
