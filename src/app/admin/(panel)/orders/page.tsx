import type { Metadata } from "next";
import Link from "next/link";
import { OrderRow, PageTitle } from "@/components/admin/ui";
import { listOrders, type OrderStatus } from "@/lib/orders";
import { releaseExpiredOrders } from "@/lib/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const TABS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting payment", statuses: ["pending_payment"] },
  { key: "to-ship", label: "To ship", statuses: ["paid"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "closed", label: "Expired & cancelled", statuses: ["expired", "cancelled"] },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const tab = TABS.find((t) => t.key === status) ?? TABS[0];
  await releaseExpiredOrders();
  const orders = await listOrders({ statuses: tab.statuses, limit: 200 });

  return (
    <>
      <PageTitle title="Orders" subtitle="Newest first. Tap an order to confirm payment or add a tracking number." />
      <nav className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter orders">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/admin/orders" : `/admin/orders?status=${t.key}`}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
              t.key === tab.key ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2 hover:border-ink/40",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {orders.length > 0 ? (
        <div className="space-y-2">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <p className="rounded-[4px] border border-dashed border-line px-4 py-14 text-center text-[13px] text-muted">No orders here yet.</p>
      )}
    </>
  );
}
