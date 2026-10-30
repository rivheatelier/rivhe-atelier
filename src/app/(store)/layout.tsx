import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCartIds } from "@/lib/cart";
import { getCurrency } from "@/lib/currency-server";
import { releaseExpiredOrders } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { getTheme } from "@/lib/theme-server";

// Prices, stock and the cart change per request, so never prerender at build time.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, currency, cartIds, theme] = await Promise.all([
    getSettings(),
    getCurrency(),
    getCartIds(),
    getTheme(),
    // Lazily return pieces from unpaid, expired orders to the shop.
    releaseExpiredOrders(),
  ]);

  return (
    <>
      <SiteHeader
        cartCount={cartIds.length}
        currency={currency.code}
        currencies={currency.options}
        theme={theme}
      />
      <main>{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
