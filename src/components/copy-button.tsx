"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@/components/icons";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard unavailable (e.g. insecure context): the value stays visible to copy by hand.
        }
      }}
      className={cn("grid h-10 w-10 shrink-0 place-items-center text-ink-2 transition-colors hover:text-ink", className)}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? <IconCheck className="h-5 w-5 text-moss" /> : <IconCopy className="h-5 w-5" />}
    </button>
  );
}
