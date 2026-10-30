import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import type { Settings } from "@/lib/settings";

// Currency and light/dark switches live in the header and the phone menu.
export function SiteFooter({ settings }: { settings: Settings }) {
  const columns: { title: string; links: { label: string; href: string }[] }[] = [
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
                  <Link href={link.href} className="hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-6 py-5 text-[12px] text-muted sm:px-8">
          © {new Date().getFullYear()} {settings.storeName}. Handmade in Indonesia.
        </p>
      </div>
    </footer>
  );
}
