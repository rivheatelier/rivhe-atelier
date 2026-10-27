import "server-only";
import type { Settings } from "@/lib/settings";
import {
  INTL_CARRIERS,
  type IntlCarrier,
  type IntlZone,
  type ShippingOption,
  type ShippingSource,
  type SignedShippingOption,
} from "@/lib/shipping-types";
import { shortHash, sign, verify } from "@/lib/sign";

type QuoteInput = { country: string; postalCode: string; weightGrams: number; valueIdr: number };

export async function getShippingOptions(
  input: QuoteInput,
  settings: Settings,
): Promise<{ options: ShippingOption[]; source: ShippingSource }> {
  if (input.country !== "ID") {
    if (!settings.internationalShipping) return { options: [], source: "international" };
    return { options: internationalOptions(input.country, input.weightGrams, settings), source: "international" };
  }

  const apiKey = process.env.BITESHIP_API_KEY;
  if (apiKey) {
    try {
      const options = await biteshipRates(apiKey, input, settings);
      if (options.length > 0) return { options, source: "biteship" };
    } catch (error) {
      console.error("[shipping] Biteship failed, falling back to estimates:", error);
    }
  }
  return { options: estimateDomestic(input.postalCode, input.weightGrams, settings), source: "estimate" };
}

// --- Biteship live rates (https://biteship.com/id/docs/api/rates/retrieve) ---

type BiteshipPricing = {
  courier_code?: string;
  courier_name?: string;
  courier_service_code?: string;
  courier_service_name?: string;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  price?: number;
};

async function biteshipRates(apiKey: string, input: QuoteInput, settings: Settings): Promise<ShippingOption[]> {
  const res = await fetch("https://api.biteship.com/v1/rates/couriers", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      origin_postal_code: Number(settings.originPostalCode),
      destination_postal_code: Number(input.postalCode),
      couriers: settings.couriers,
      items: [{ name: "Handmade crochet goods", value: input.valueIdr, weight: input.weightGrams, quantity: 1 }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string; pricing?: BiteshipPricing[] } | null;
  if (!res.ok || !json?.success || !Array.isArray(json.pricing)) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  return json.pricing
    .filter((p) => typeof p.price === "number" && p.courier_code)
    .map((p) => ({
      id: `${p.courier_code}:${p.courier_service_code ?? "default"}`,
      courier: (p.courier_name ?? p.courier_code ?? "").trim(),
      service: (p.courier_service_name ?? p.courier_service_code ?? "").trim(),
      eta: biteshipEta(p),
      price: Math.round(p.price as number),
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);
}

function biteshipEta(p: BiteshipPricing): string {
  const range = (p.shipment_duration_range ?? "").replace(/\s*-\s*/, "–").trim();
  if (range) return `${range} ${p.shipment_duration_unit === "hours" ? "hours" : "days"}`;
  return p.duration ?? "";
}

// --- Built-in estimates (used when Biteship isn't configured or fails) ---

type Region =
  | "jakarta"
  | "jabodetabek"
  | "westJava"
  | "centralJava"
  | "eastJava"
  | "sumatra"
  | "bali"
  | "nusaTenggara"
  | "kalimantan"
  | "sulawesi"
  | "malukuPapua";

/** Indonesian postal codes are grouped by region in their first two digits. */
function regionFor(postalCode: string): Region {
  const n = Number(postalCode.slice(0, 2));
  if (n >= 10 && n <= 14) return "jakarta";
  if (n >= 15 && n <= 17) return "jabodetabek";
  if (n >= 40 && n <= 46) return "westJava";
  if (n >= 50 && n <= 59) return "centralJava";
  if (n >= 60 && n <= 69) return "eastJava";
  if (n >= 20 && n <= 39) return "sumatra";
  if (n >= 80 && n <= 82) return "bali";
  if (n >= 83 && n <= 87) return "nusaTenggara";
  if (n >= 70 && n <= 79) return "kalimantan";
  if (n >= 90 && n <= 96) return "sulawesi";
  return "malukuPapua";
}

// Approximate Rupiah per kg from Jakarta, close to public JNE/SiCepat rates.
const ESTIMATES: Record<Region, { reg: number; yes: number | null; sicepat: number; eta: string }> = {
  jakarta: { reg: 10000, yes: 18000, sicepat: 9000, eta: "1–2 business days" },
  jabodetabek: { reg: 11000, yes: 20000, sicepat: 10000, eta: "1–2 business days" },
  westJava: { reg: 13000, yes: 24000, sicepat: 12000, eta: "2–3 business days" },
  centralJava: { reg: 18000, yes: 30000, sicepat: 16000, eta: "2–4 business days" },
  eastJava: { reg: 21000, yes: 34000, sicepat: 19000, eta: "2–4 business days" },
  sumatra: { reg: 32000, yes: 52000, sicepat: 30000, eta: "3–5 business days" },
  bali: { reg: 28000, yes: 46000, sicepat: 26000, eta: "2–4 business days" },
  nusaTenggara: { reg: 40000, yes: 66000, sicepat: 38000, eta: "3–6 business days" },
  kalimantan: { reg: 42000, yes: 68000, sicepat: 40000, eta: "3–6 business days" },
  sulawesi: { reg: 45000, yes: 72000, sicepat: 43000, eta: "3–6 business days" },
  malukuPapua: { reg: 95000, yes: null, sicepat: 90000, eta: "5–9 business days" },
};

function estimateDomestic(postalCode: string, weightGrams: number, settings: Settings): ShippingOption[] {
  const kg = Math.max(1, Math.ceil(weightGrams / 1000));
  const origin = regionFor(settings.originPostalCode);
  const destination = regionFor(postalCode);
  const rate = origin === destination ? ESTIMATES.jakarta : ESTIMATES[destination];

  const options: ShippingOption[] = [
    { id: "jne:reg", courier: "JNE", service: "Regular", eta: rate.eta, price: rate.reg * kg },
  ];
  if (rate.yes) options.push({ id: "jne:yes", courier: "JNE", service: "YES", eta: "1–2 business days", price: rate.yes * kg });
  options.push({ id: "sicepat:reg", courier: "SiCepat", service: "Regular", eta: rate.eta, price: rate.sicepat * kg });
  if (origin === "jakarta" && destination === "jakarta") {
    options.push({ id: "sameday", courier: "Sameday", service: "Jakarta only", eta: "Delivered today", price: 25000 });
  }
  return options;
}

// --- International: DHL Express and Aramex via Pos Indonesia (per-kg zone rates set in admin) ---

const ASEAN = new Set(["SG", "MY", "BN", "TH", "PH", "VN", "KH", "LA", "MM", "TL"]);
const ASIA_PACIFIC = new Set(["AU", "NZ", "JP", "KR", "CN", "HK", "TW", "MO", "IN", "PG", "FJ"]);

export function intlZone(country: string): IntlZone {
  if (ASEAN.has(country)) return "asean";
  if (ASIA_PACIFIC.has(country)) return "asiaPacific";
  return "world";
}

function internationalOptions(country: string, weightGrams: number, settings: Settings): ShippingOption[] {
  const zone = intlZone(country);
  const kg = Math.max(1, Math.ceil(weightGrams / 1000));
  return (Object.keys(INTL_CARRIERS) as IntlCarrier[])
    .filter((carrier) => settings.intlCarriers[carrier].enabled && settings.intlCarriers[carrier].ratePerKg[zone] > 0)
    .map((carrier) => ({
      id: `intl:${carrier}:${zone}`,
      courier: INTL_CARRIERS[carrier].name,
      service: "via Pos Indonesia",
      eta: INTL_CARRIERS[carrier].eta,
      price: settings.intlCarriers[carrier].ratePerKg[zone] * kg,
    }));
}

// --- Signed quotes ---------------------------------------------------------
// The browser carries the chosen quote to the "place order" step. Signing it means
// the price can't be edited, and it is only valid for the same address and cart.
// It also locks the USD→IDR rate the buyer was shown, so the Rupiah transfer
// amount can't shift between the payment step and the order.

type QuoteContext = { country: string; postalCode: string; cartIds: string[] };
type QuotePayload = { o: ShippingOption; c: string; p: string; k: string; r: number; e: number };

const QUOTE_TTL_MS = 2 * 60 * 60 * 1000;

const cartKey = (ids: string[]) => shortHash([...ids].sort().join(","));
const normalizePostal = (value: string) => value.replace(/\s+/g, "").toUpperCase();

export function signOptions(options: ShippingOption[], ctx: QuoteContext & { usdRate: number }): SignedShippingOption[] {
  const base = {
    c: ctx.country,
    p: normalizePostal(ctx.postalCode),
    k: cartKey(ctx.cartIds),
    r: ctx.usdRate,
    e: Date.now() + QUOTE_TTL_MS,
  };
  return options.map((o) => ({ ...o, token: sign({ ...base, o } satisfies QuotePayload) }));
}

export function verifyQuote(token: string, ctx: QuoteContext): { option: ShippingOption; usdRate: number } | null {
  const payload = verify<QuotePayload>(token);
  if (!payload || payload.e < Date.now() || !(payload.r > 0)) return null;
  if (payload.c !== ctx.country || payload.p !== normalizePostal(ctx.postalCode)) return null;
  if (payload.k !== cartKey(ctx.cartIds)) return null;
  return { option: payload.o, usdRate: payload.r };
}
