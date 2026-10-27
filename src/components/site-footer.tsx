import Link from "next/link";
import { CurrencySwitch } from "@/components/currency-select";
import { ThemeSwitch } from "@/components/theme-switch";
import { Wordmark } from "@/components/wordmark";
import type { ActiveCurrency } from "@/lib/currency-server";
import type { Settings } from "@/lib/settings";
import type { Theme } from "@/lib/theme";

export function SiteFooter({ settings, currency, theme }: { settings: Settings; currency: ActiveCurrency; theme: Theme }) {
  const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: "Shop",
      links: [
        { label: "All pieces", href: "/shop" },
        { label: "Available now", href: "/shop?available=1" },
      ],
    },
    {
      title: "Help",
      links: [
        { label: "Shipping & returns", href: "/shipping-returns" },
        { label: "Care guide", href: "/care" },
        { label: "Track your order", href: "/track" },
        { label: "Terms & conditions", href: "/terms" },
      ],
    },
    {
      title: "Atelier",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        ...(settings.instagram
          ? [{ label: "Instagram", href: `https://instagram.com/${settings.instagram}`, external: true }]
          : []),
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-line bg-cream/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-11 px-6 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:py-16">
        <div className="col-span-2 md:col-span-1">
          <Wordmark align="start" />
          <p className="mt-6 font-script text-[30px] leading-none text-ink-2">{settings.tagline}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="eyebrow text-ink">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-[14px] text-ink-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className="hover:text-ink">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-ink">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col-reverse gap-4 px-6 py-5 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. Handmade in Indonesia.
          </p>
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <CurrencySwitch value={currency.code} options={currency.options} />
            <ThemeSwitch initial={theme} labels />
          </div>
        </div>
      </div>
    </footer>
  );
}
