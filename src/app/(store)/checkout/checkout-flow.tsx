"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { placeOrderAction, quoteShippingAction } from "@/app/(store)/actions";
import { IconBank, IconCheck, IconInfo } from "@/components/icons";
import { PaymentDetails, type BankDetails } from "@/components/payment-details";
import type { Country } from "@/lib/countries";
import {
  displayPrice,
  formatAmount,
  formatIDR,
  formatMoney,
  fromIdr,
  idrFromUsd,
  transferAmountFor,
  type Currency,
} from "@/lib/currency";
import type { SignedShippingOption } from "@/lib/shipping-types";
import { cn } from "@/lib/utils";
import { EMPTY_ADDRESS, normalizeAddress, validateAddress, type AddressErrors, type AddressInput } from "@/lib/validation";

type Item = { id: string; name: string; priceUsd: number; image: string | null };

type Props = {
  items: Item[];
  /** Display currency and the live rate when the page loaded. */
  currency: Currency;
  bank: BankDetails;
  paymentSuffix: number;
  reservationHours: number;
  countries: Country[];
  /** Changes whenever the cart does, so a saved quote for another cart is discarded. */
  cartKey: string;
};

type Step = "address" | "shipping" | "payment" | "review";
const STEPS: Step[] = ["address", "shipping", "payment", "review"];
const STORAGE_KEY = "rivhe_checkout";
// Quotes are signed for 2 hours on the server; drop saved ones a little before that.
const QUOTE_MAX_AGE_MS = 100 * 60 * 1000;

const stepUrl = (step: Step) => (step === "address" ? "/checkout" : `/checkout?step=${step}`);

export function CheckoutFlow({ items, currency, bank, paymentSuffix, reservationHours, countries, cartKey }: Props) {
  const params = useSearchParams();
  const param = params.get("step");
  const requested: Step = STEPS.includes(param as Step) ? (param as Step) : "address";

  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [options, setOptions] = useState<SignedShippingOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The USD→IDR rate locked into the shipping quote; the order is charged at exactly this rate.
  const [lockedRate, setLockedRate] = useState<number | null>(null);
  const [quotedAt, setQuotedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const [message, setMessage] = useState<{ text: string; unavailable?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  // Keep progress across reloads and the back button (per tab, cleared after ordering).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.address) setAddress({ ...EMPTY_ADDRESS, ...saved.address });
      if (saved?.cartKey === cartKey && saved.lockedRate > 0 && Date.now() - (saved.quotedAt ?? 0) < QUOTE_MAX_AGE_MS) {
        setOptions(saved.options ?? null);
        setSelectedId(saved.selectedId ?? null);
        setLockedRate(saved.lockedRate);
        setQuotedAt(saved.quotedAt);
      }
    } catch {
      // Storage unavailable (private mode): start fresh.
    }
    setRestored(true);
  }, [cartKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ cartKey, address, options, selectedId, lockedRate, quotedAt }));
    } catch {
      // Ignore: progress just won't survive a reload.
    }
  }, [restored, cartKey, address, options, selectedId, lockedRate, quotedAt]);

  const selected = options?.find((o) => o.id === selectedId) ?? null;

  // Never show a step whose earlier steps aren't done.
  let step = requested;
  if (step !== "address" && !options) step = "address";
  if ((step === "payment" || step === "review") && !selected) step = options ? "shipping" : "address";

  useEffect(() => {
    if (restored && step !== requested) window.history.replaceState(null, "", stepUrl(step));
  }, [restored, step, requested]);

  const go = (next: Step) => {
    setMessage(null);
    window.history.pushState(null, "", stepUrl(next));
    window.scrollTo({ top: 0 });
  };

  // Rupiah — what the bank transfer is for. Same formula the server uses to place the order.
  const view: Currency = { code: currency.code, rate: lockedRate ?? currency.rate };
  const shippingCost = selected?.price ?? 0;
  const subtotalIdr = items.reduce((sum, item) => sum + idrFromUsd(item.priceUsd, view.rate), 0);
  const total = subtotalIdr + shippingCost;
  const transfer = transferAmountFor(total, paymentSuffix);
  // What the buyer sees: dollar prices (or their Rupiah) plus converted shipping.
  const money = (idr: number) => formatMoney(idr, view);
  const show = (value: number) => formatAmount(value, view.code);
  const itemPrice = (item: Item) => show(displayPrice(item.priceUsd, view));
  const displaySubtotal = items.reduce((sum, item) => sum + displayPrice(item.priceUsd, view), 0);
  const displayTotal = displaySubtotal + fromIdr(shippingCost, view);
  const countryName = countries.find((c) => c.code === address.country)?.name ?? address.country;

  const bind = (name: keyof AddressInput) => ({
    name,
    id: `checkout-${name}`,
    value: address[name],
    "aria-invalid": errors[name] ? true : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setAddress((current) => ({ ...current, [name]: value }));
      if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const submitAddress = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = normalizeAddress(address);
    const found = validateAddress(next);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      form.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    setAddress(next);
    setMessage(null);
    startTransition(async () => {
      const result = await quoteShippingAction({ country: next.country, postalCode: next.postalCode });
      if (!result.ok) {
        setMessage({ text: result.error });
        return;
      }
      setOptions(result.options);
      setLockedRate(result.usdRate);
      setQuotedAt(Date.now());
      setSelectedId((current) => (result.options.some((o) => o.id === current) ? current : result.options[0].id));
      go("shipping");
    });
  };

  const submitOrder = () => {
    if (!selected) return;
    setMessage(null);
    startTransition(async () => {
      // On success the action redirects to the thank-you page.
      const result = await placeOrderAction({ address, quoteToken: selected.token });
      if (!result || result.ok) return;
      if (result.requote) {
        // The saved options carry the stale token too, so start again from the address (still filled in).
        setOptions(null);
        setSelectedId(null);
        setLockedRate(null);
        setQuotedAt(null);
        go("address");
      }
      setMessage({ text: result.error, unavailable: result.unavailable });
    });
  };

  const waitingForRestore = !restored && requested !== "address";

  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 lg:pt-12">
      <Stepper step={step} onBack={go} />

      <div className="mt-9 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-14">
        <div className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
          {waitingForRestore ? (
            <div className="h-80 animate-pulse rounded-[2px] bg-cream/60" />
          ) : step === "address" ? (
            <form ref={form} onSubmit={submitAddress} noValidate className="space-y-4">
              <h2 className="font-serif text-[28px] leading-tight">Shipping Address</h2>
              <Field label="Email" htmlFor="checkout-email" error={errors.email}>
                <input {...bind("email")} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" className="field" />
              </Field>
              <Field label="Full Name" htmlFor="checkout-name" error={errors.name}>
                <input {...bind("name")} autoComplete="name" className="field" />
              </Field>
              <Field label="Phone Number" htmlFor="checkout-phone" error={errors.phone}>
                <input {...bind("phone")} type="tel" autoComplete="tel" inputMode="tel" placeholder="+62 812 3456 7890" className="field" />
              </Field>
              <Field label="Country / Region" htmlFor="checkout-country" error={errors.country}>
                <select {...bind("country")} autoComplete="country" className="field">
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Address" htmlFor="checkout-address" error={errors.address}>
                <textarea
                  {...bind("address")}
                  rows={3}
                  autoComplete="street-address"
                  placeholder={address.country === "ID" ? "Jl. Melati No. 12, Kebayoran Baru" : "Street address, apartment, suite"}
                  className="field"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" htmlFor="checkout-city" error={errors.city}>
                  <input {...bind("city")} autoComplete="address-level2" className="field" />
                </Field>
                <Field label="Postal Code" htmlFor="checkout-postalCode" error={errors.postalCode}>
                  <input
                    {...bind("postalCode")}
                    autoComplete="postal-code"
                    inputMode={address.country === "ID" ? "numeric" : "text"}
                    className="field"
                  />
                </Field>
              </div>
              <Field
                label={address.country === "ID" ? "Province" : "State / Province / Region"}
                htmlFor="checkout-province"
                error={errors.province}
              >
                <input {...bind("province")} autoComplete="address-level1" className="field" />
              </Field>
              <Field label="Order note (optional)" htmlFor="checkout-notes">
                <textarea {...bind("notes")} rows={2} placeholder="A gift message or delivery instructions" className="field" />
              </Field>

              {message && <Notice>{message.text}</Notice>}

              <button type="submit" disabled={pending} className="btn-primary mt-2 w-full">
                {pending ? "Calculating shipping…" : "Continue to Shipping"}
              </button>
              <div className="pt-1 text-center">
                <Link href="/cart" className="link-underline text-[13px]">
                  Back to cart
                </Link>
              </div>
            </form>
          ) : step === "shipping" && options ? (
            <div>
              <h2 className="font-serif text-[28px] leading-tight">Shipping Method</h2>
              <div className="mt-4 flex items-start justify-between gap-4 rounded-[2px] bg-cream/70 px-4 py-3 text-[13px] text-ink-2">
                <p>
                  <span className="text-muted">Ship to </span>
                  {address.city}, {address.postalCode} · {countryName}
                </p>
                <button type="button" onClick={() => go("address")} className="link-underline shrink-0 text-ink">
                  Change
                </button>
              </div>
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Choose a shipping method</legend>
                {options.map((option) => (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-[2px] border bg-surface px-4 py-4 transition-colors",
                      selectedId === option.id ? "border-ink" : "border-line hover:border-ink/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={selectedId === option.id}
                      onChange={() => setSelectedId(option.id)}
                      className="h-[18px] w-[18px] shrink-0 accent-ink"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] text-ink">
                        {option.courier} {option.service}
                      </span>
                      <span className="block text-[12px] text-muted">{option.eta}</span>
                    </span>
                    <span className="text-[14px] whitespace-nowrap text-ink">{money(option.price)}</span>
                  </label>
                ))}
              </fieldset>
              <button type="button" onClick={() => go("payment")} disabled={!selected} className="btn-primary mt-7 w-full">
                Continue to Payment
              </button>
              <BackButton onClick={() => go("address")} />
            </div>
          ) : step === "payment" && selected ? (
            <div>
              <h2 className="font-serif text-[28px] leading-tight">Payment Method</h2>
              <div className="mt-5 rounded-[2px] border border-line bg-surface p-4">
                <label className="flex items-center gap-3">
                  <input type="radio" checked readOnly className="h-[18px] w-[18px] accent-ink" />
                  <IconBank className="h-5 w-5 text-ink-2" />
                  <span className="text-[15px] text-ink">Bank Transfer</span>
                </label>
                <div className="mt-4">
                  <PaymentDetails bank={bank} amount={transfer} approx={currency.code !== "IDR" ? show(displayTotal) : undefined} />
                </div>
              </div>
              <div className="mt-4 flex gap-3 rounded-[2px] bg-cream/70 p-4 text-[12px] leading-relaxed text-ink-2">
                <IconInfo className="h-5 w-5 shrink-0" />
                <p>
                  Transfer after you place your order — these details are emailed to you as well. Your order is processed once the payment is
                  received, and a receipt is sent to your email. Pieces are held for {reservationHours} hours.
                </p>
              </div>
              <button type="button" onClick={() => go("review")} className="btn-primary mt-7 w-full">
                Continue to Review
              </button>
              <BackButton onClick={() => go("shipping")} />
            </div>
          ) : step === "review" && selected ? (
            <div>
              <h2 className="font-serif text-[28px] leading-tight">Review Your Order</h2>
              <ItemList items={items} price={itemPrice} className="mt-5" />
              <dl className="mt-5 space-y-2 text-[14px] text-ink-2">
                <div className="flex justify-between gap-4">
                  <dt>Subtotal</dt>
                  <dd className="text-ink">{show(displaySubtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    Shipping ({selected.courier} {selected.service})
                  </dt>
                  <dd className="whitespace-nowrap text-ink">{money(shippingCost)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-3 font-serif text-[24px] text-ink">
                  <dt>Total</dt>
                  <dd>{show(displayTotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-[13px]">
                  <dt>Bank transfer amount</dt>
                  <dd className="font-medium text-ink">{formatIDR(transfer)}</dd>
                </div>
              </dl>

              <div className="mt-6 grid grid-cols-1 gap-3 break-words sm:grid-cols-2">
                <SummaryCard title="Ship to" onEdit={() => go("address")}>
                  {address.name}
                  <br />
                  <span className="whitespace-pre-line">{address.address}</span>
                  <br />
                  {address.city}, {address.province} {address.postalCode}
                  <br />
                  {countryName}
                  <br />
                  {address.phone} · {address.email}
                </SummaryCard>
                <SummaryCard title="Payment" onEdit={() => go("payment")}>
                  Bank transfer · {bank.name}
                  <br />
                  {formatIDR(transfer)}
                </SummaryCard>
              </div>

              <p className="mt-6 rounded-[2px] bg-cream/70 p-4 text-[12px] leading-relaxed text-ink-2">
                By placing this order, you agree to our{" "}
                <Link href="/terms" target="_blank" className="link-underline text-ink">
                  Terms & Conditions
                </Link>{" "}
                and acknowledge that all items are handmade and final sale.
              </p>

              {message && (
                <Notice>
                  {message.text}{" "}
                  {message.unavailable && (
                    <Link href="/cart" className="link-underline">
                      Review your cart
                    </Link>
                  )}
                </Notice>
              )}

              <button type="button" onClick={submitOrder} disabled={pending} className="btn-primary mt-6 w-full">
                {pending ? "Placing your order…" : "Place Order"}
              </button>
              <BackButton onClick={() => go("payment")} />
            </div>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28 border border-line bg-surface p-6">
            <h2 className="eyebrow">Order summary</h2>
            <ItemList items={items} price={itemPrice} className="mt-4" compact />
            <dl className="mt-4 space-y-2 text-[13px] text-ink-2">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="text-ink">{show(displaySubtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="text-ink">{selected ? money(shippingCost) : "Calculated next"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 font-serif text-[20px] text-ink">
                <dt>Total</dt>
                <dd>{show(displayTotal)}</dd>
              </div>
            </dl>
            {currency.code !== "IDR" && <p className="mt-3 text-[11px] text-muted">Payment is made in IDR.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stepper({ step, onBack }: { step: Step; onBack: (step: Step) => void }) {
  const current = step === "review" ? 3 : step === "payment" ? 2 : 1;
  const steps: { n: number; label: string; target: Step }[] = [
    { n: 1, label: "Shipping", target: "address" },
    { n: 2, label: "Payment", target: "payment" },
    { n: 3, label: "Review", target: "review" },
  ];
  return (
    <ol className="flex items-center justify-center gap-2 text-[12px]" aria-label="Checkout progress">
      {steps.map(({ n, label, target }) => (
        <li key={n} className="flex items-center gap-2">
          {n > 1 && <span className="h-px w-5 bg-line sm:w-10" aria-hidden="true" />}
          <button
            type="button"
            disabled={n >= current}
            onClick={() => onBack(target)}
            aria-current={n === current ? "step" : undefined}
            className={cn("flex items-center gap-2 disabled:cursor-default", n === current ? "text-ink" : n < current ? "text-ink-2" : "text-muted")}
          >
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border text-[11px]",
                n === current ? "border-ink bg-ink text-paper" : n < current ? "border-ink-2" : "border-line",
              )}
            >
              {n < current ? <IconCheck className="h-3.5 w-3.5" /> : n}
            </span>
            {label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-[2px] bg-clay-soft px-4 py-3 text-[13px] leading-relaxed text-clay">
      {children}
    </p>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-5 text-center">
      <button type="button" onClick={onClick} className="link-underline text-[13px]">
        Back
      </button>
    </div>
  );
}

function SummaryCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[2px] border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow text-ink">{title}</p>
        <button type="button" onClick={onEdit} className="link-underline text-[12px] text-ink">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function ItemList({
  items,
  price,
  className,
  compact = false,
}: {
  items: Item[];
  price: (item: Item) => string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul className={cn("divide-y divide-line", !compact && "border-y border-line", className)}>
      {items.map((item) => (
        <li key={item.id} className={cn("flex items-center gap-4", compact ? "py-3" : "py-4")}>
          <div className={cn("relative aspect-[4/5] shrink-0 overflow-hidden bg-cream", compact ? "w-12" : "w-16")}>
            {item.image && <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-ink", compact ? "text-[13px]" : "text-[14px]")}>{item.name}</p>
            <p className="text-[12px] text-muted">×1</p>
          </div>
          <p className={cn("whitespace-nowrap text-ink", compact ? "text-[13px]" : "text-[14px]")}>{price(item)}</p>
        </li>
      ))}
    </ul>
  );
}
