import { CopyButton } from "@/components/copy-button";
import { IconBank } from "@/components/icons";
import { formatIDR } from "@/lib/currency";

export type BankDetails = { name: string; accountNumber: string; accountName: string };

/**
 * Bank transfer instructions: account to pay into and the exact amount, whose
 * last two digits identify the payment. Used in checkout, on the thank-you page
 * and on the order page.
 */
export function PaymentDetails({
  bank,
  amount,
  approx,
  deadline,
}: {
  bank: BankDetails;
  amount: number;
  /** The amount in the buyer's display currency, when it isn't IDR. */
  approx?: string;
  deadline?: string;
}) {
  const lastTwo = String(amount % 100).padStart(2, "0");

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-[2px] border border-line bg-paper p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-cream text-ink-2">
            <IconBank className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-medium tracking-wide text-ink">{bank.name}</p>
            <p className="truncate text-[12px] text-ink-2">{bank.accountName}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <div>
            <p className="text-[11px] tracking-[0.12em] text-muted uppercase">Account number</p>
            <p className="font-serif text-[24px] leading-tight tracking-wide text-ink">{bank.accountNumber}</p>
          </div>
          <CopyButton value={bank.accountNumber.replace(/\s+/g, "")} label="Copy account number" />
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-ink-2">
        Please transfer the exact amount below. The last 2 digits must be <span className="font-medium text-clay">{lastTwo}</span> to
        confirm your payment.
      </p>

      <div className="flex items-center justify-between rounded-[2px] border border-clay/25 bg-clay-soft p-4">
        <div>
          <p className="text-[11px] tracking-[0.12em] text-clay uppercase">Total payment</p>
          <p className="font-serif text-[28px] leading-tight text-ink">
            {formatIDR(Math.floor(amount / 100) * 100).slice(0, -2)}
            <span className="text-clay">{lastTwo}</span>
          </p>
          {approx && <p className="mt-0.5 text-[12px] text-ink-2">≈ {approx}</p>}
        </div>
        <CopyButton value={String(amount)} label="Copy amount" />
      </div>

      {deadline && (
        <p className="text-[12px] leading-relaxed text-ink-2">
          Transfer before <span className="font-medium text-ink">{deadline}</span>. After that, the order is cancelled automatically and the
          piece returns to the shop.
        </p>
      )}
    </div>
  );
}
