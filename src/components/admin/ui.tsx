import Image from "next/image";
import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";
import { formatIDR } from "@/lib/currency";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/lib/orders";
import type { ProductStatus } from "@/lib/products";
import { cn, timeAgo, timeLeft } from "@/lib/utils";

const ORDER_TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-warn-soft text-warn",
  paid: "bg-ok-soft text-ok",
  shipped: "bg-info-soft text-info",
  completed: "bg-sand text-ink-2",
  expired: "bg-sand text-muted",
  cancelled: "bg-clay-soft text-clay",
};

const ADMIN_ORDER_LABEL: Record<OrderStatus, string> = { ...ORDER_STATUS_LABEL, paid: "Paid · to ship" };

export function OrderBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap", ORDER_TONE[status])}>
      {ADMIN_ORDER_LABEL[status]}
    </span>
  );
}

const PRODUCT_TONE: Record<ProductStatus, string> = {
  available: "bg-ok-soft text-ok",
  reserved: "bg-warn-soft text-warn",
  sold: "bg-ink text-paper",
  draft: "border border-dashed border-ink/30 text-ink-2",
};

const PRODUCT_LABEL: Record<ProductStatus, string> = { available: "Available", reserved: "Reserved", sold: "Sold", draft: "Draft" };

export function ProductBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap", PRODUCT_TONE[status])}>
      {PRODUCT_LABEL[status]}
    </span>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-[30px] leading-tight lg:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-ml-1 mb-3 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
      <IconChevronLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}

export function Card({ title, id, action, children, className }: {
  title?: string;
  id?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 rounded-[4px] border border-line bg-surface p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="eyebrow text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Banner({ tone = "success", children }: { tone?: "success" | "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 rounded-[3px] px-4 py-3 text-[13px] leading-relaxed",
        tone === "success" && "bg-ok-soft text-ok",
        tone === "error" && "bg-clay-soft text-clay",
        tone === "info" && "bg-cream text-ink-2",
      )}
    >
      {children}
    </p>
  );
}

export function OrderRow({ order }: { order: Order }) {
  const cover = order.items[0]?.image;
  const when =
    order.status === "pending_payment" ? timeLeft(order.expiresAt) : order.status === "paid" && order.paidAt ? `paid ${timeAgo(order.paidAt)}` : timeAgo(order.createdAt);

  return (
    <Link
      href={`/admin/orders/${order.code}`}
      className="flex items-center gap-3 rounded-[4px] border border-line bg-surface p-3 transition-colors hover:border-ink/30"
    >
      <div className="relative aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-[2px] bg-cream">
        {cover && <Image src={cover} alt="" fill sizes="44px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-medium text-ink">#{order.code}</span>
          <OrderBadge status={order.status} />
        </div>
        <p className="mt-0.5 truncate text-[12px] text-ink-2">
          {order.name} · {order.items.map((i) => i.name).join(", ")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[13px] font-medium text-ink">{formatIDR(order.transferAmount)}</p>
        <p className={cn("text-[11px]", order.status === "pending_payment" ? "text-warn" : "text-muted")}>{when}</p>
      </div>
    </Link>
  );
}
