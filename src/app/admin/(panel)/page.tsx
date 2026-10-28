import Link from "next/link";
import { Card, OrderRow } from "@/components/admin/ui";
import { IconAlert, IconChevronRight, IconPlus } from "@/components/icons";
import { formatIDR } from "@/lib/currency";
import { emailProvider } from "@/lib/email";
import { requireAdmin } from "@/lib/auth";
import { countOrders, listOrders, paidOrdersSince } from "@/lib/orders";
import { adminCountProducts, releaseExpiredOrders } from "@/lib/products";
import { getSettings, PLACEHOLDER_BANK_NUMBER } from "@/lib/settings";

function jakartaNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", hour: "2-digit", hour12: false })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { year: parts.year, month: parts.month, hour: Number(parts.hour) };
}

export default async function AdminDashboard() {
  await requireAdmin();
  await releaseExpiredOrders();
  const now = jakartaNow();
  const monthStart = new Date(`${now.year}-${now.month}-01T00:00:00+07:00`).toISOString();

  const [awaitingPayment, toShip, products, month, settings, attention] = await Promise.all([
    countOrders("pending_payment"),
    countOrders("paid"),
    adminCountProducts(),
    paidOrdersSince(monthStart),
    getSettings(),
    listOrders({ statuses: ["pending_payment", "paid"], limit: 20 }),
  ]);

  const setup = [
    settings.bankAccountNumber === PLACEHOLDER_BANK_NUMBER && { text: "Add your real bank account for transfers", href: "/admin/settings#bank" },
    !settings.sellerEmail && { text: "Choose the inbox that receives new-order emails", href: "/admin/settings#store" },
    !emailProvider() && {
      text: "Connect an email service (Resend or SMTP) so buyers receive their confirmation and receipt",
      href: "/admin/settings#email",
    },
    !settings.contactEmail && !settings.whatsapp && { text: "Add contact details for buyers", href: "/admin/settings#store" },
    !process.env.BITESHIP_API_KEY && { text: "Optional: connect Biteship for live courier rates", href: "/admin/settings#shipping" },
  ].filter((item): item is { text: string; href: string } => Boolean(item));

  const greeting = now.hour < 11 ? "Good morning" : now.hour < 15 ? "Good afternoon" : now.hour < 19 ? "Good evening" : "Good evening";

  const stats = [
    { label: "Awaiting payment", value: awaitingPayment, href: "/admin/orders?status=pending" },
    { label: "To ship", value: toShip, href: "/admin/orders?status=to-ship" },
    { label: "Pieces on sale", value: products.available, href: "/admin/products?status=available" },
    { label: "Sold this month", value: month.count, sub: formatIDR(month.revenue), href: "/admin/orders?status=completed" },
  ];

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted">{greeting}</p>
          <h1 className="font-serif text-[32px] leading-tight lg:text-[36px]">Atelier overview</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary h-10 shrink-0 px-4 text-[12px]">
          <IconPlus className="h-4 w-4" /> New piece
        </Link>
      </div>

      {setup.length > 0 && (
        <Card title="Finish setting up" className="mb-5 border-warn/25 bg-warn-soft">
          <ul className="space-y-1">
            {setup.map((item) => (
              <li key={item.text}>
                <Link href={item.href} className="flex items-start gap-3 rounded-[3px] py-1.5 text-[13px] text-warn hover:underline">
                  <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.text}</span>
                  <IconChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-[4px] border border-line bg-surface p-4 transition-colors hover:border-ink/30">
            <p className="text-[12px] text-ink-2">{stat.label}</p>
            <p className="mt-1 font-serif text-[34px] leading-none text-ink">{stat.value}</p>
            {stat.sub && <p className="mt-1.5 truncate text-[12px] text-muted">{stat.sub}</p>}
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="eyebrow">Needs your attention</h2>
          <Link href="/admin/orders" className="text-[12px] text-ink-2 hover:text-ink">
            All orders
          </Link>
        </div>
        {attention.length > 0 ? (
          <div className="space-y-2">
            {attention.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <p className="rounded-[4px] border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">
            All caught up — no payments to check or parcels to send.
          </p>
        )}
      </section>
    </>
  );
}
