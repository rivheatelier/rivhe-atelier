"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconGrid, IconHome, IconPage, IconReceipt, IconSettings } from "@/components/icons";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Home", icon: IconHome, exact: true },
  { href: "/admin/orders", label: "Orders", icon: IconReceipt },
  { href: "/admin/products", label: "Products", icon: IconGrid },
  { href: "/admin/pages", label: "Pages", icon: IconPage },
  { href: "/admin/settings", label: "Settings", icon: IconSettings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
}

/** Bottom tab bar on phones. */
export function AdminTabBar({ attention }: { attention: number }) {
  const isActive = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Admin"
    >
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-full flex-col items-center justify-center gap-1 text-[10px] tracking-[0.06em]", active ? "text-ink" : "text-muted")}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 1.7 : 1.4} />
                {label}
                {href === "/admin/orders" && attention > 0 && (
                  <span className="absolute top-2 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[9px] text-paper">
                    {attention}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Sidebar links on larger screens. */
export function AdminSideNav({ attention }: { attention: number }) {
  const isActive = useActive();
  return (
    <ul className="space-y-1">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-[14px] transition-colors",
                active ? "bg-cream text-ink" : "text-ink-2 hover:bg-cream/60 hover:text-ink",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{label}</span>
              {href === "/admin/orders" && attention > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1.5 text-[11px] text-paper">{attention}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
