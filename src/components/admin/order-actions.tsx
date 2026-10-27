"use client";

import { useState, useTransition } from "react";
import {
  cancelOrderAction,
  confirmPaymentAction,
  markCompletedAction,
  markShippedAction,
  saveOrderNoteAction,
  updateTrackingAction,
  type ActionResult,
} from "@/app/admin/actions";
import { formatIDR } from "@/lib/currency";
import type { OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

type Props = {
  orderId: string;
  status: OrderStatus;
  transferAmount: number;
  bankName: string;
  deadline: string;
  timeLeft: string;
  paidAt: string;
  shippedAt: string;
  expiredAt: string;
  shippingService: string;
  trackingNumber: string;
  /** For expired orders: every piece is still free, so a late payment can be accepted. */
  canAcceptLatePayment: boolean;
};

export function OrderActions(props: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [tracking, setTracking] = useState(props.trackingNumber);
  const lastTwo = String(props.transferAmount % 100).padStart(2, "0");

  const run = (task: () => Promise<ActionResult>, question?: string) => {
    if (question && !window.confirm(question)) return;
    setResult(null);
    startTransition(async () => setResult(await task()));
  };

  const confirmQuestion = `Has exactly ${formatIDR(props.transferAmount)} (ending in ${lastTwo}) arrived in your ${props.bankName} account?\n\nThe buyer and you will get the receipt by email.`;

  return (
    <div className="space-y-3">
      {props.status === "pending_payment" && (
        <Panel tone="amber">
          <p className="text-[13px]">Waiting for a transfer of</p>
          <p className="mt-1 font-serif text-[30px] leading-none text-ink">
            {formatIDR(Math.floor(props.transferAmount / 100) * 100).slice(0, -2)}
            <span className="text-clay">{lastTwo}</span>
          </p>
          <p className="mt-2 text-[12px]">
            to {props.bankName} · {props.timeLeft} (until {props.deadline})
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <button type="button" disabled={pending} onClick={() => run(() => confirmPaymentAction(props.orderId), confirmQuestion)} className="btn-primary">
              {pending ? "Working…" : "Confirm payment received"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelOrderAction(props.orderId, { restock: true, notify: true }),
                  "Cancel this order? Its pieces go back on sale and the buyer is emailed.",
                )
              }
              className="btn-secondary"
            >
              Cancel order
            </button>
          </div>
        </Panel>
      )}

      {props.status === "expired" && (
        <Panel tone="neutral">
          <p className="text-[13px] leading-relaxed">
            Expired {props.expiredAt} without payment. The pieces went back on sale.
          </p>
          {props.canAcceptLatePayment ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => confirmPaymentAction(props.orderId), `Accept a late payment?\n\n${confirmQuestion}`)}
              className="btn-secondary mt-4 w-full sm:w-auto"
            >
              Received a late transfer? Confirm payment
            </button>
          ) : (
            <p className="mt-2 text-[12px] text-clay">
              A piece from this order has since been reserved or sold to someone else. If the buyer pays late, refund them.
            </p>
          )}
        </Panel>
      )}

      {props.status === "paid" && (
        <Panel tone="green">
          <p className="text-[13px]">Paid {props.paidAt}. Pack it up and ship with {props.shippingService}.</p>
          <form
            className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => markShippedAction(props.orderId, tracking));
            }}
          >
            <label className="sr-only" htmlFor="tracking">
              Tracking number
            </label>
            <input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Tracking number (resi)"
              required
              className="field bg-surface"
            />
            <button type="submit" disabled={pending} className="btn-primary h-11">
              {pending ? "Working…" : "Mark as shipped"}
            </button>
          </form>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => cancelOrderAction(props.orderId, { restock: true, notify: true }),
                "Cancel this paid order and put its pieces back on sale?\n\nRemember to refund the buyer yourself.",
              )
            }
            className="mt-4 text-[12px] text-clay underline underline-offset-4"
          >
            Cancel and refund
          </button>
        </Panel>
      )}

      {props.status === "shipped" && (
        <Panel tone="blue">
          <p className="text-[13px]">
            Shipped {props.shippedAt} with {props.shippingService}.
          </p>
          <form
            className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => updateTrackingAction(props.orderId, tracking));
            }}
          >
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} aria-label="Tracking number" className="field bg-surface" />
            <button type="submit" disabled={pending || tracking === props.trackingNumber} className="btn-secondary h-11">
              Update tracking
            </button>
          </form>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markCompletedAction(props.orderId), "Mark this order as delivered and completed?")}
            className="btn-primary mt-3 w-full sm:w-auto"
          >
            Mark as completed
          </button>
        </Panel>
      )}

      {result && (
        <p role="status" className={cn("rounded-[3px] px-4 py-3 text-[13px]", result.ok ? "bg-ok-soft text-ok" : "bg-clay-soft text-clay")}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}

function Panel({ tone, children }: { tone: "amber" | "green" | "blue" | "neutral"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[4px] border p-4 sm:p-5",
        tone === "amber" && "border-warn/25 bg-warn-soft text-warn",
        tone === "green" && "border-ok/25 bg-ok-soft text-ok",
        tone === "blue" && "border-info/25 bg-info-soft text-info",
        tone === "neutral" && "border-line bg-cream/60 text-ink-2",
      )}
    >
      {children}
    </div>
  );
}

export function OrderNote({ orderId, initial }: { orderId: string; initial: string }) {
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Only you can see this — e.g. “wrapped as a gift”."
        className="field"
        aria-label="Private note"
      />
      <button
        type="button"
        disabled={pending || note === saved}
        onClick={() =>
          startTransition(async () => {
            const result = await saveOrderNoteAction(orderId, note);
            if (result.ok) setSaved(note);
          })
        }
        className="btn-secondary mt-3 h-10 px-5"
      >
        {pending ? "Saving…" : note === saved ? "Saved" : "Save note"}
      </button>
    </div>
  );
}
