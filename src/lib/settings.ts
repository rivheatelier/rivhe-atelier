import "server-only";
import { cache } from "react";
import type { IntlCarrier, IntlZone } from "@/lib/shipping-types";
import { db } from "@/lib/supabase/admin";

export type IntlCarrierSetting = { enabled: boolean; ratePerKg: Record<IntlZone, number> };

export type Settings = {
  storeName: string;
  tagline: string;
  heroSubtitle: string;
  heroImages: string[];
  sellerEmail: string;
  contactEmail: string;
  instagram: string;
  whatsapp: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  /** Replaces the last two digits of every transfer amount. */
  paymentSuffix: number;
  /** How long an unpaid order holds its pieces. */
  reservationHours: number;
  /** Last good live rate (Rupiah per US dollar), used if every rate source is down. */
  usdRate: number;
  usdRateSource: string;
  usdRateUpdatedAt: string | null;
  originPostalCode: string;
  originCity: string;
  /** Biteship courier codes, comma-separated. */
  couriers: string;
  internationalShipping: boolean;
  /** DHL Express and Aramex (through Pos Indonesia), each with a per-kg rate by zone. */
  intlCarriers: Record<IntlCarrier, IntlCarrierSetting>;
  shippingNote: string;
  careNote: string;
};

export const PLACEHOLDER_BANK_NUMBER = "123 456 7890";

export const DEFAULT_SETTINGS: Settings = {
  storeName: "RIVHÉ Atelier",
  tagline: "Every stitch tells a different story",
  heroSubtitle: "Handmade crochet goods for a slower, brighter everyday",
  heroImages: ["/seed/pastel-horizon-2.jpg", "/seed/seaglass-weave-2.jpg", "/seed/pastel-horizon-1.jpg"],
  sellerEmail: "",
  contactEmail: "",
  instagram: "",
  whatsapp: "",
  bankName: "BCA",
  bankAccountNumber: PLACEHOLDER_BANK_NUMBER,
  bankAccountName: "PT Rivhé Atelier",
  paymentSuffix: 17,
  reservationHours: 24,
  usdRate: 18150,
  usdRateSource: "",
  usdRateUpdatedAt: null,
  originPostalCode: "12120",
  originCity: "Jakarta Selatan",
  couriers: "jne,sicepat,anteraja,jnt",
  internationalShipping: true,
  intlCarriers: {
    dhl: { enabled: true, ratePerKg: { asean: 450000, asiaPacific: 550000, world: 750000 } },
    aramex: { enabled: true, ratePerKg: { asean: 300000, asiaPacific: 400000, world: 550000 } },
  },
  shippingNote:
    "Ships within 1–3 working days after your payment is confirmed. Shipping is calculated at checkout: JNE and SiCepat within Indonesia, DHL Express or Aramex (via Pos Indonesia) worldwide.",
  careNote:
    "Spot clean with a damp cloth and mild soap, or hand wash gently in cold water. Reshape and dry flat in the shade, and store away from direct sunlight.",
};

function mergeSettings(stored: unknown): Settings {
  const s = (stored && typeof stored === "object" ? stored : {}) as Partial<Settings>;
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...s,
    intlCarriers: {
      dhl: mergeCarrier(DEFAULT_SETTINGS.intlCarriers.dhl, s.intlCarriers?.dhl),
      aramex: mergeCarrier(DEFAULT_SETTINGS.intlCarriers.aramex, s.intlCarriers?.aramex),
    },
  };
  // Settings saved before prices moved to USD + live rates: keep their USD rate as the fallback.
  const legacy = stored as { currencies?: { code?: string; rate?: number }[] } | null;
  const legacyUsd = Number(legacy?.currencies?.find((c) => c?.code === "USD")?.rate);
  if (s.usdRate === undefined && legacyUsd > 0) merged.usdRate = legacyUsd;
  if (!(Number(merged.usdRate) > 0)) merged.usdRate = DEFAULT_SETTINGS.usdRate;
  for (const key of ["intlRatePerKg", "currencies", "defaultCurrency", "autoCurrency", "ratesUpdatedAt"]) {
    delete (merged as Record<string, unknown>)[key];
  }
  if (!Array.isArray(merged.heroImages)) merged.heroImages = DEFAULT_SETTINGS.heroImages;
  merged.paymentSuffix = clampInt(merged.paymentSuffix, 0, 99, DEFAULT_SETTINGS.paymentSuffix);
  merged.reservationHours = clampInt(merged.reservationHours, 1, 168, DEFAULT_SETTINGS.reservationHours);
  return merged;
}

function mergeCarrier(fallback: IntlCarrierSetting, saved: Partial<IntlCarrierSetting> | undefined): IntlCarrierSetting {
  return { enabled: saved?.enabled ?? fallback.enabled, ratePerKg: { ...fallback.ratePerKg, ...(saved?.ratePerKg ?? {}) } };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Uncached read, for writes and for code running outside a request (e.g. `after`). */
export async function loadSettings(): Promise<Settings> {
  const { data, error } = await db().from("settings").select("value").eq("key", "store").maybeSingle();
  if (error) {
    console.error("[settings] using defaults:", error.message);
    return mergeSettings(null);
  }
  return mergeSettings(data?.value);
}

export const getSettings = cache(loadSettings);

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = mergeSettings({ ...(await loadSettings()), ...patch });
  const { error } = await db().from("settings").upsert({ key: "store", value: next });
  if (error) throw new Error(error.message);
  return next;
}
