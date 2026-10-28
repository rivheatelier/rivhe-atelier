import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheckCircle } from "@/components/icons";
import { PaymentDetails } from "@/components/payment-details";
import { formatUSD } from "@/lib/currency";
import { getOrderForCustomer, orderUsdTotal } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { ClearCheckoutProgress } from "./clear-checkout-progress";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

type SearchParams = Promise<{ order?: string; t?: string }>;

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const { order: code, t } = await searchParams;
  const [order, settings] = await Promise.all([code ? getOrderForCustomer(code, t) : null, getSettings()]);
  if (!order) notFound();

  const orderUrl = `/order/${order.code}?t=${order.accessToken}`;
  const awaitingPayment = order.status === "pending_payment";

  return (
    <div className="mx-auto max-w-md px-5 pt-14 text-center sm:pt-20">
      <ClearCheckoutProgress />
      <IconCheckCircle className="mx-auto h-14 w-14 text-ink" strokeWidth={1} />
      <h1 className="mt-5 font-serif text-[38px] leading-tight">Thank You!</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
        Your order <span className="text-ink">#{order.code}</span> has been placed successfully. We’ve sent the details to{" "}
        <span className="text-ink">{order.email}</span>
        {awaitingPayment ? ", and your receipt will follow once your transfer is confirmed." : "."}
      </p>

      {awaitingPayment && (
        <div className="mt-9 rounded-[2px] border border-line bg-surface p-5">
          <p className="eyebrow mb-4 text-left">Complete your payment</p>
          <PaymentDetails
            bank={{
              name: settings.bankName,
              accountNumber: settings.bankAccountNumber,
              accountName: settings.bankAccountName,
              swift: settings.bankSwift,
            }}
            amount={order.transferAmount}
            approx={
              order.currency === "USD" ? formatUSD(orderUsdTotal(order)) : undefined
            }
            deadline={formatDateTime(order.expiresAt)}
            international={order.country !== "ID"}
          />
        </div>
      )}

      <div className="mt-9 flex flex-col items-center gap-5">
        <Link href={orderUrl} className="btn-primary px-10">
          View Order
        </Link>
        <Link href="/shop" className="link-underline text-[13px]">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
