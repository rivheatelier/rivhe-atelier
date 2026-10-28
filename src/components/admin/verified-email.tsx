"use client";

import { useState, useTransition } from "react";
import { sendEmailCodeAction, verifyEmailCodeAction, type ActionResult } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type Step = "view" | "edit" | "code";

/** A store email address that changes only once the admin enters the code sent to the new one. */
export function VerifiedEmail({ field, label, hint, current }: {
  field: "sellerEmail" | "contactEmail";
  label: string;
  hint: string;
  current: string;
}) {
  const [address, setAddress] = useState(current);
  const [step, setStep] = useState<Step>("view");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const go = (next: Step) => {
    setStep(next);
    setResult(null);
  };

  const run = (task: () => Promise<ActionResult>, onSuccess: () => void) =>
    startTransition(async () => {
      let outcome: ActionResult;
      try {
        outcome = await task();
      } catch {
        outcome = { ok: false, error: "Something went wrong. Please try again." };
      }
      setResult(outcome);
      if (outcome.ok) onSuccess();
    });

  function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    setEmail(value);
    run(() => sendEmailCodeAction(field, value), () => setStep("code"));
  }

  function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    run(
      () => verifyEmailCodeAction(field, code),
      () => {
        setAddress(email);
        setStep("view");
      },
    );
  }

  return (
    <div>
      <p className="field-label">{label}</p>

      {step === "view" && (
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-[14px] text-ink">{address || <span className="text-muted">Not set</span>}</p>
          <button type="button" onClick={() => go("edit")} className="btn-secondary h-10 shrink-0 px-5">
            Change
          </button>
        </div>
      )}

      {step === "edit" && (
        <form onSubmit={sendCode}>
          <input
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            defaultValue={email}
            placeholder="name@example.com"
            aria-label={`New address: ${label}`}
            className="field"
          />
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={pending} className="btn-primary h-10 px-5">
              {pending ? "Sending…" : "Send code"}
            </button>
            <button type="button" onClick={() => go("view")} className="link-underline text-[13px] text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verify}>
          <p className="text-[13px] leading-relaxed text-ink-2">
            Enter the 6-digit code sent to <span className="text-ink">{email}</span>.
          </p>
          <div className="mt-3 flex gap-3">
            <input
              name="code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit code"
              className="field w-36 text-center tracking-[0.3em]"
            />
            <button type="submit" disabled={pending} className="btn-primary h-11 px-5">
              {pending ? "Checking…" : "Verify"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => sendEmailCodeAction(field, email), () => {})}
              className="link-underline text-ink"
            >
              Send again
            </button>
            <button type="button" onClick={() => go("edit")} className="link-underline text-ink">
              Use a different address
            </button>
          </div>
        </form>
      )}

      {result && !pending && (
        <p role="status" className={cn("mt-2 text-[13px]", result.ok ? "text-moss" : "text-clay")}>
          {result.ok ? result.message : result.error}
        </p>
      )}
      {step !== "code" && <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
