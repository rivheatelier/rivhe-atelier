"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CurrencySwitch } from "@/components/currency-select";
import { IconBag, IconClose, IconInstagram, IconMenu, IconSearch, IconUser } from "@/components/icons";
import { ThemeSwitch, ThemeToggle } from "@/components/theme-switch";
import { Wordmark } from "@/components/wordmark";
import type { CurrencyCode } from "@/lib/currency";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  cartCount: number;
  currency: CurrencyCode;
  currencies: CurrencyCode[];
  categories: string[];
  instagram: string;
  theme: Theme;
};

const DESKTOP_NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/care", label: "Care" },
  { href: "/contact", label: "Contact" },
];

const SECONDARY_NAV = [
  { href: "/about", label: "About" },
  { href: "/care", label: "Care guide" },
  { href: "/shipping-returns", label: "Shipping & returns" },
  { href: "/track", label: "Track your order" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ cartCount, currency, currencies, categories, instagram, theme }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close overlays whenever the route changes.
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-1.5 sm:px-5 lg:h-[76px] lg:px-8">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <IconMenu />
            </button>
            <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
              {DESKTOP_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("eyebrow transition-colors hover:text-ink", pathname.startsWith(item.href) ? "text-ink" : "text-ink-2")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" aria-label="RIVHÉ Atelier — home" className="px-2">
            <Wordmark />
          </Link>

          <div className="flex items-center justify-end">
            <div className="mr-1 hidden items-center gap-1 lg:flex">
              <CurrencySwitch value={currency} options={currencies} />
              <ThemeToggle />
            </div>
            <Link href="/track" aria-label="Track your order" className="grid h-10 w-10 place-items-center">
              <IconUser />
            </Link>
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Search"
              aria-expanded={searchOpen}
              className="grid h-10 w-10 place-items-center"
            >
              <IconSearch />
            </button>
            <Link href="/cart" aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} className="relative grid h-10 w-10 place-items-center">
              <IconBag />
              {cartCount > 0 && (
                <span className="absolute top-1 right-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-ink px-1 text-[10px] leading-none text-paper">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
      </header>

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
        currency={currency}
        currencies={currencies}
        instagram={instagram}
        theme={theme}
      />
    </>
  );
}

function SearchBar({ onClose }: { onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  return (
    <div className="border-t border-line bg-paper">
      <Form action="/shop" role="search" className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-2.5">
        <IconSearch className="h-5 w-5 shrink-0 text-muted" />
        <input
          ref={input}
          name="q"
          type="search"
          placeholder="Search pieces…"
          aria-label="Search pieces"
          className="h-10 w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <button type="button" onClick={onClose} aria-label="Close search" className="grid h-10 w-10 shrink-0 place-items-center">
          <IconClose className="h-5 w-5" />
        </button>
      </Form>
    </div>
  );
}

function MenuDrawer({
  open,
  onClose,
  categories,
  currency,
  currencies,
  instagram,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  categories: string[];
  currency: CurrencyCode;
  currencies: CurrencyCode[];
  instagram: string;
  theme: Theme;
}) {
  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "visible" : "invisible")} inert={!open}>
      <div
        className={cn("absolute inset-0 bg-black/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-paper shadow-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-1.5">
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center">
            <IconClose />
          </button>
          <Wordmark size="sm" />
          <span className="w-10" />
        </div>

        <nav className="flex-1 overflow-y-auto px-7 py-9" aria-label="Menu">
          <ul className="space-y-3">
            <li>
              <Link href="/shop" className="font-serif text-[30px] leading-tight">
                Shop all
              </Link>
            </li>
            <li>
              <Link href="/shop?available=1" className="font-serif text-[30px] leading-tight">
                Available now
              </Link>
            </li>
            {categories.length > 1 &&
              categories.map((category) => (
                <li key={category}>
                  <Link href={`/shop?category=${encodeURIComponent(category)}`} className="font-serif text-[30px] leading-tight">
                    {category}
                  </Link>
                </li>
              ))}
          </ul>
          <ul className="mt-10 space-y-4 border-t border-line pt-8">
            {SECONDARY_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="eyebrow text-ink-2">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-7 py-5">
          <CurrencySwitch value={currency} options={currencies} />
          <ThemeSwitch initial={theme} />
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center text-ink-2"
            >
              <IconInstagram />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
