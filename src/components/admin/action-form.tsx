"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { useFormAction } from "@/components/use-form-action";
import { cn } from "@/lib/utils";

/** A button that runs an argument-less Server Action and shows its result. */
export function ActionButton({ action, label }: { action: () => Promise<ActionResult>; label: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await action()))}
        className="btn-secondary h-10 px-5"
      >
        {pending ? "Working…" : label}
      </button>
      {result && !pending && (
        <p role="status" className={cn("text-[13px]", result.ok ? "text-moss" : "text-clay")}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}

/** A form bound to a Server Action, with a pending state and the action's result message. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  className,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const [state, form, pending] = useFormAction(action, { ok: false });

  return (
    <form {...form} className={className}>
      {children}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={pending} className="btn-primary h-11 px-7">
          {pending ? pendingLabel : submitLabel}
        </button>
        {!pending && (state.error || state.message) && (
          <p role="status" className={cn("text-[13px]", state.error ? "text-clay" : "text-moss")}>
            {state.error ?? state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function Field({ label, hint, htmlFor, children, className }: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
