"use client";

import { useState, useTransition } from "react";
import { setCurrencyAction } from "@/app/(store)/actions";
import type { CurrencyCode } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** USD | IDR toggle. USD is the store's currency; IDR shows the same prices at today's rate. */
export function CurrencySwitch({ value, options, className }: { value: CurrencyCode; options: CurrencyCode[]; className?: string }) {
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState<CurrencyCode | null>(null);
  const active = pending && requested ? requested : value;

  return (
    <div role="group" aria-label="Currency" className={cn("inline-flex shrink-0 rounded-full border border-line bg-surface p-[3px]", className)}>
      {options.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={code === active}
          disabled={pending}
          onClick={() => {
            if (code === value) return;
            setRequested(code);
            startTransition(async () => {
              await setCurrencyAction(code);
            });
          }}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[11px] leading-none tracking-[0.1em] transition-colors",
            code === active ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
