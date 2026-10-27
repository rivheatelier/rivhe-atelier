import "server-only";
import { after } from "next/server";
import { cache } from "react";
import { getSettings, updateSettings } from "@/lib/settings";

export type UsdRate = {
  /** Rupiah per US dollar. */
  rate: number;
  source: string;
  /** false when every live source failed and the last stored rate is used. */
  live: boolean;
  updatedAt: string | null;
};

// Free sources without an API key, most up to date first.
const SOURCES: { name: string; url: string; read: (json: unknown) => unknown }[] = [
  {
    name: "Coinbase",
    url: "https://api.coinbase.com/v2/exchange-rates?currency=USD",
    read: (json) => (json as { data?: { rates?: { IDR?: string } } })?.data?.rates?.IDR,
  },
  {
    name: "open.er-api.com",
    url: "https://open.er-api.com/v6/latest/USD",
    read: (json) => (json as { rates?: { IDR?: number } })?.rates?.IDR,
  },
  {
    name: "currency-api",
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    read: (json) => (json as { usd?: { idr?: number } })?.usd?.idr,
  },
];

const TTL_MS = 10 * 60 * 1000;
let latest: { rate: number; source: string; at: number } | null = null;

async function fetchLiveRate(): Promise<{ rate: number; source: string } | null> {
  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const rate = Number(source.read(await res.json()));
      // Sanity range guards against a broken or spoofed response.
      if (Number.isFinite(rate) && rate > 5000 && rate < 50000) return { rate: Math.round(rate * 100) / 100, source: source.name };
    } catch {
      // Try the next source.
    }
  }
  return null;
}

/**
 * Rupiah per US dollar from live market data, refreshed at most every 10 minutes.
 * The last good rate is kept in settings and used if every source is down.
 */
export const getUsdRate = cache(async (): Promise<UsdRate> => {
  if (latest && Date.now() - latest.at < TTL_MS) {
    return { rate: latest.rate, source: latest.source, live: true, updatedAt: new Date(latest.at).toISOString() };
  }

  const [live, settings] = await Promise.all([fetchLiveRate(), getSettings()]);
  if (live) {
    latest = { ...live, at: Date.now() };
    const storedAt = settings.usdRateUpdatedAt ? new Date(settings.usdRateUpdatedAt).getTime() : 0;
    const moved = Math.abs(live.rate - settings.usdRate) / settings.usdRate > 0.002;
    if (moved || Date.now() - storedAt > 60 * 60 * 1000) {
      after(() =>
        updateSettings({ usdRate: live.rate, usdRateSource: live.source, usdRateUpdatedAt: new Date().toISOString() }).catch((error) =>
          console.error("[rate] could not store the latest rate:", error),
        ),
      );
    }
    return { ...live, live: true, updatedAt: new Date().toISOString() };
  }

  console.error("[rate] all live sources failed; using the last stored rate");
  return { rate: settings.usdRate, source: settings.usdRateSource || "stored", live: false, updatedAt: settings.usdRateUpdatedAt };
});

/** Fetches a fresh rate right now (admin "Refresh" button). */
export async function refreshUsdRate(): Promise<UsdRate | null> {
  latest = null;
  const live = await fetchLiveRate();
  if (!live) return null;
  latest = { ...live, at: Date.now() };
  const updatedAt = new Date().toISOString();
  await updateSettings({ usdRate: live.rate, usdRateSource: live.source, usdRateUpdatedAt: updatedAt });
  return { ...live, live: true, updatedAt };
}
