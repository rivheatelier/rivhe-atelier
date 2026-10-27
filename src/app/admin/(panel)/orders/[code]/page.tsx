import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions, OrderNote } from "@/components/admin/order-actions";
import { BackLink, Card, OrderBadge } from "@/components/admin/ui";
import { CopyButton } from "@/components/copy-button";
import { countryName } from "@/lib/countries";
import { formatIDR, formatUSD } from "@/lib/currency";
import { getOrderByCode, listOrderEmails, orderUsdTotal } from "@/lib/orders";
import { getProductsByIds, releaseExpiredOrders } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { cn, formatDateTime, timeLeft, whatsappLink } from "@/lib/utils";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: `#${(await params).code}` };
}

const EMAIL_LABEL: Record<string, string> = {
  order_placed_buyer: "Order confirmation → buyer",
  order_placed_seller: "New order → you",
  receipt_buyer: "Receipt → buyer",
  receipt_seller: "Payment confirmed → you",
  shipped_buyer: "Shipped → buyer",
  cancelled_buyer: "Cancelled → buyer",
};

export default async function AdminOrderPage({ params }: { params: Params }) {
  const { code } = await params;
  await releaseExpiredOrders();
  const order = await getOrderByCode(code);
  if (!order) notFound();

  const productIds = order.items.map((i) => i.productId).filter((id): id is string => Boolean(id));
  const [emails, settings, products] = await Promise.all([listOrderEmails(order.id), getSettings(), getProductsByIds(productIds)]);
  const canAcceptLatePayment =
    order.status === "expired" &&
    productIds.length === order.items.length &&
    products.every((p) => p.status === "available" || p.heldByOrderId === order.id);

  const addressText = [
    order.name,
    order.phone,
    order.address,
    `${order.city}${order.province ? `, ${order.province}` : ""} ${order.postalCode}`,
    countryName(order.country),
  ].join("\n");

  const timeline = [
    { label: "Placed", at: order.createdAt },
    { label: "Paid", at: order.paidAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Completed", at: order.completedAt },
    { label: "Cancelled", at: order.cancelledAt },
    { label: order.status === "expired" ? "Expired" : "Payment deadline", at: order.expiresAt, hide: !["pending_payment", "expired"].includes(order.status) },
  ].filter((step) => step.at && !step.hide);

  return (
    <>
      <BackLink href="/admin/orders">Orders</BackLink>
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-serif text-[32px] leading-none">#{order.code}</h1>
        <OrderBadge status={order.status} />
      </div>
      <p className="-mt-3 mb-5 text-[13px] text-muted">Placed {formatDateTime(order.createdAt)}</p>

      <OrderActions
        orderId={order.id}
        status={order.status}
        transferAmount={order.transferAmount}
        bankName={settings.bankName}
        deadline={formatDateTime(order.expiresAt)}
        timeLeft={timeLeft(order.expiresAt)}
        paidAt={formatDateTime(order.paidAt)}
        shippedAt={formatDateTime(order.shippedAt)}
        expiredAt={formatDateTime(order.expiresAt)}
        shippingService={order.shippingService}
        trackingNumber={order.trackingNumber}
        canAcceptLatePayment={canAcceptLatePayment}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Items" className="lg:col-span-2">
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-[2px] bg-cream">
                  {item.image && <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  {item.productId ? (
                    <Link href={`/admin/products/${item.productId}`} className="text-[14px] text-ink hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    <p className="text-[14px] text-ink">{item.name}</p>
                  )}
                </div>
                <p className="text-[14px] text-ink">{formatIDR(item.price)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[13px] text-ink-2">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd className="text-ink">{formatIDR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Shipping · {order.shippingService}</dt>
              <dd className="whitespace-nowrap text-ink">{formatIDR(order.shippingCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Total</dt>
              <dd className="text-ink">{formatIDR(order.total)}</dd>
            </div>
            <div className="flex justify-between gap-4 pt-1 text-[15px]">
              <dt className="text-ink">Bank transfer amount</dt>
              <dd className="font-medium text-ink">{formatIDR(order.transferAmount)}</dd>
            </div>
            {order.currency === "USD" && (
              <p className="pt-1 text-[12px] text-muted">
                Buyer saw {formatUSD(orderUsdTotal(order))} · locked at {formatIDR(Math.round(order.currencyRate))} per US$.
              </p>
            )}
          </dl>
        </Card>

        <Card title="Customer">
          <p className="text-[14px] text-ink">{order.name}</p>
          <div className="mt-2 space-y-1.5 text-[13px]">
            <a href={`mailto:${order.email}`} className="block text-ink-2 hover:text-ink hover:underline">
              {order.email}
            </a>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="text-ink-2 hover:text-ink hover:underline">
                {order.phone}
              </a>
              {order.country === "ID" && (
                <a
                  href={whatsappLink(order.phone, `Hi ${order.name.split(" ")[0]}, this is RIVHÉ Atelier about your order #${order.code}.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2 hover:border-ink/40"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 rounded-[3px] bg-cream/70 p-3 text-[13px] leading-relaxed text-ink-2">
              <p className="eyebrow mb-1 text-[10px] text-ink">Note from buyer</p>
              <p className="whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </Card>

        <Card title="Ship to" action={<CopyButton value={addressText} label="Copy address for the shipping label" className="-my-2 -mr-2" />}>
          <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{addressText}</p>
          <p className="mt-3 text-[12px] text-muted">
            {order.shippingService}
            {order.shippingEta && ` · ${order.shippingEta}`}
            {order.trackingNumber && ` · Resi ${order.trackingNumber}`}
          </p>
        </Card>

        <Card title="Timeline">
          <ol className="space-y-2.5">
            {timeline.map((step) => (
              <li key={step.label} className="flex justify-between gap-4 text-[13px]">
                <span className="text-ink">{step.label}</span>
                <span className="text-right text-ink-2">{formatDateTime(step.at)}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Private note">
          <OrderNote orderId={order.id} initial={order.adminNote} />
        </Card>

        <Card title="Emails" className="lg:col-span-2">
          {emails.length > 0 ? (
            <ul className="divide-y divide-line">
              {emails.map((email) => (
                <li key={email.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{EMAIL_LABEL[email.kind] ?? email.kind}</p>
                    <p className="truncate text-[12px] text-muted">
                      {email.toEmail} · {formatDateTime(email.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px]",
                      email.status === "sent" && "bg-ok-soft text-ok",
                      email.status === "failed" && "bg-clay-soft text-clay",
                      email.status === "logged" && "bg-cream text-ink-2",
                    )}
                    title={email.error || undefined}
                  >
                    {email.status === "logged" ? "not sent" : email.status}
                  </span>
                  <a href={`/admin/emails/${email.id}`} target="_blank" rel="noreferrer" className="text-[12px] text-ink underline underline-offset-4">
                    View
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No emails yet.</p>
          )}
          {emails.some((e) => e.status === "logged") && (
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              “Not sent” means no email service is connected yet — the message was saved here instead. See Settings → Email.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
