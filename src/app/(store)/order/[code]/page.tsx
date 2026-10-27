import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentDetails } from "@/components/payment-details";
import { countryName } from "@/lib/countries";
import { formatIDR, formatUSD } from "@/lib/currency";
import { getOrderForCustomer, ORDER_STATUS_LABEL, orderUsdTotal, type Order } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { cn, formatDateTime, whatsappLink } from "@/lib/utils";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> };

const PROGRESS: { label: string; at: (o: Order) => string | null }[] = [
  { label: "Placed", at: (o) => o.createdAt },
  { label: "Paid", at: (o) => o.paidAt },
  { label: "Shipped", at: (o) => o.shippedAt },
  { label: "Delivered", at: (o) => o.completedAt },
];

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ code }, { t }] = await Promise.all([params, searchParams]);
  const [order, settings] = await Promise.all([getOrderForCustomer(code, t), getSettings()]);
  if (!order) notFound();

  const closed = order.status === "expired" || order.status === "cancelled";
  const contact = settings.whatsapp
    ? { href: whatsappLink(settings.whatsapp, `Hi RIVHÉ, about my order #${order.code}`), label: "WhatsApp us" }
    : settings.contactEmail
      ? { href: `mailto:${settings.contactEmail}?subject=Order%20%23${order.code}`, label: "Email us" }
      : { href: "/contact", label: "Contact us" };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 sm:px-8 lg:pt-14">
      <p className="eyebrow text-muted">Order #{order.code}</p>
      <h1 className="mt-2 font-serif text-[34px] leading-tight">{headline(order)}</h1>
      <p className="mt-2 text-[13px] text-muted">Placed {formatDateTime(order.createdAt)}</p>

      {!closed && (
        <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Order progress">
          {PROGRESS.map((stage) => {
            const done = !!stage.at(order);
            return (
              <li key={stage.label} className="text-center">
                <span className={cn("block h-[3px] rounded-full", done ? "bg-ink" : "bg-line")} />
                <span className={cn("mt-2 block text-[11px] tracking-[0.08em] uppercase", done ? "text-ink" : "text-muted")}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.status === "pending_payment" && (
        <section className="mt-9 rounded-[2px] border border-line bg-surface p-5">
          <p className="eyebrow mb-4">Complete your payment</p>
          <PaymentDetails
            bank={{ name: settings.bankName, accountNumber: settings.bankAccountNumber, accountName: settings.bankAccountName }}
            amount={order.transferAmount}
            approx={
              order.currency === "USD" ? formatUSD(orderUsdTotal(order)) : undefined
            }
            deadline={formatDateTime(order.expiresAt)}
          />
        </section>
      )}

      {order.status === "shipped" && order.trackingNumber && (
        <section className="mt-9 rounded-[2px] bg-cream/70 p-5 text-[14px] text-ink-2">
          <p className="eyebrow mb-3 text-ink">Tracking</p>
          <p>
            {order.shippingService} · <span className="font-medium tracking-wide text-ink">{order.trackingNumber}</span>
          </p>
        </section>
      )}

      {closed && (
        <p className="mt-8 rounded-[2px] bg-clay-soft px-4 py-3 text-[13px] leading-relaxed text-clay">
          {order.status === "expired"
            ? "We didn’t receive the payment in time, so this order was cancelled and its pieces returned to the shop. If you have already transferred, please contact us."
            : "This order has been cancelled. If you have questions, please contact us."}
        </p>
      )}

      <section className="mt-10">
        <h2 className="eyebrow mb-3">Items</h2>
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-cream">
                {item.image && <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <Link href={`/products/${item.slug}`} className="text-[14px] text-ink">
                    {item.name}
                  </Link>
                ) : (
                  <p className="text-[14px] text-ink">{item.name}</p>
                )}
                <p className="text-[12px] text-muted">×1</p>
              </div>
              <p className="text-[14px] text-ink">{formatIDR(item.price)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 text-[14px] text-ink-2">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="text-ink">{formatIDR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Shipping ({order.shippingService})</dt>
            <dd className="whitespace-nowrap text-ink">{formatIDR(order.shippingCost)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-3 font-serif text-[22px] text-ink">
            <dt>{order.paidAt ? "Paid" : "Total to transfer"}</dt>
            <dd>{formatIDR(order.transferAmount)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-3 text-[13px] leading-relaxed break-words text-ink-2 sm:grid-cols-2">
        <div className="rounded-[2px] border border-line bg-surface p-4">
          <p className="eyebrow mb-2 text-ink">Ship to</p>
          {order.name}
          <br />
          <span className="whitespace-pre-line">{order.address}</span>
          <br />
          {order.city}
          {order.province && `, ${order.province}`} {order.postalCode}
          <br />
          {countryName(order.country)}
        </div>
        <div className="rounded-[2px] border border-line bg-surface p-4">
          <p className="eyebrow mb-2 text-ink">Status</p>
          {ORDER_STATUS_LABEL[order.status]}
          <br />
          {order.shippingService}
          {order.shippingEta && ` · ${order.shippingEta}`}
        </div>
      </section>

      <p className="mt-10 text-center text-[13px] text-ink-2">
        Questions about your order?{" "}
        <a href={contact.href} className="link-underline text-ink">
          {contact.label}
        </a>
      </p>
    </div>
  );
}

function headline(order: Order): string {
  switch (order.status) {
    case "pending_payment":
      return "Awaiting your transfer";
    case "paid":
      return "Payment received — we’re preparing your order";
    case "shipped":
      return "Your order is on its way";
    case "completed":
      return "Delivered — enjoy your piece";
    case "expired":
      return "This order has expired";
    case "cancelled":
      return "This order was cancelled";
  }
}
