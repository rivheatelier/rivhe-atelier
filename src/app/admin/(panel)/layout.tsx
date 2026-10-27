import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { AdminSideNav, AdminTabBar } from "@/components/admin/admin-nav";
import { IconExternal, IconLogout } from "@/components/icons";
import { ThemeSwitch, ThemeToggle } from "@/components/theme-switch";
import { Wordmark } from "@/components/wordmark";
import { requireAdmin } from "@/lib/auth";
import { countOrders } from "@/lib/orders";
import { getTheme } from "@/lib/theme-server";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [awaitingPayment, toShip, theme] = await Promise.all([countOrders("pending_payment"), countOrders("paid"), getTheme()]);
  const attention = awaitingPayment + toShip;

  return (
    <div className="lg:grid lg:min-h-svh lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-svh flex-col p-5">
          <Link href="/admin" className="mb-9 flex items-end gap-2.5 px-3 pt-2">
            <Wordmark size="sm" align="start" />
            <span className="mb-[1px] text-[10px] tracking-[0.2em] text-muted uppercase">Admin</span>
          </Link>
          <AdminSideNav attention={attention} />
          <div className="mt-auto space-y-3 border-t border-line px-3 pt-5 text-[13px] text-ink-2">
            <ThemeSwitch initial={theme} labels />
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-ink">
              <IconExternal className="h-4 w-4" /> View store
            </a>
            <form action={logoutAction}>
              <button type="submit" className="flex items-center gap-2 hover:text-ink">
                <IconLogout className="h-4 w-4" /> Sign out
              </button>
            </form>
            <p className="truncate text-[12px] text-muted">{admin.email}</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 pr-1.5 pl-4 backdrop-blur lg:hidden">
          <Link href="/admin" className="flex items-end gap-2">
            <Wordmark size="sm" align="start" />
            <span className="mb-[1px] text-[9px] tracking-[0.2em] text-muted uppercase">Admin</span>
          </Link>
          <div className="flex items-center text-ink-2">
            <ThemeToggle />
            <a href="/" target="_blank" rel="noreferrer" aria-label="View store" className="grid h-10 w-10 place-items-center text-ink-2">
              <IconExternal className="h-5 w-5" />
            </a>
            <form action={logoutAction}>
              <button type="submit" aria-label="Sign out" className="grid h-10 w-10 place-items-center text-ink-2">
                <IconLogout className="h-5 w-5" />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pt-6 pb-28 sm:px-6 lg:max-w-4xl lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
      </div>

      <AdminTabBar attention={attention} />
    </div>
  );
}
