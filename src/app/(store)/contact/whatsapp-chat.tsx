"use client";

import type { AltchaWidgetElement } from "altcha";
import type {} from "altcha/types/react";
import { useEffect, useRef, useState } from "react";
import { revealWhatsappAction } from "@/app/(store)/actions";
import { IconChat } from "@/components/icons";
import { cn } from "@/lib/utils";

const LABEL = {
  idle: "Chat with us",
  checking: "Checking you’re not a robot…",
  opening: "Opening WhatsApp…",
  failed: "Couldn’t check — try again",
};

/**
 * The WhatsApp row on Contact. The number isn't in the page: a tap solves the same ALTCHA
 * proof of work as Track your order, out of sight, and the server answers that solution
 * with the wa.me link, which the browser then follows.
 */
export function WhatsappChat() {
  const widgetRef = useRef<HTMLElement>(null);
  const linkRef = useRef<string | null>(null);
  const checkRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<keyof typeof LABEL>("idle");

  useEffect(() => {
    // Defines <altcha-widget>, which only exists in the browser.
    void import("altcha");
    // Leaving Contact mid-check stops it, so it can't pull the visitor off the next page.
    return () => checkRef.current?.abort();
  }, []);

  async function chat() {
    if (status === "checking") return;
    // One check per visit: after it, a tap goes straight to WhatsApp.
    let link = linkRef.current;
    if (!link) {
      setStatus("checking");
      const check = (checkRef.current = new AbortController());
      try {
        await import("altcha");
        const solved = await (widgetRef.current as AltchaWidgetElement | null)?.verify({ controller: check });
        if (solved) link = await revealWhatsappAction(solved.payload);
      } catch {
        // Offline, or the check didn't finish: the row offers another try.
      }
      if (check.signal.aborted) return;
      if (!link) {
        setStatus("failed");
        return;
      }
      linkRef.current = link;
      // Switched away meanwhile: wait for their next tap rather than open WhatsApp unseen.
      if (document.hidden) {
        setStatus("idle");
        return;
      }
    }
    setStatus("opening");
    window.location.assign(link);
    // WhatsApp may open over this page and leave it as it was: settle back for the next tap.
    window.setTimeout(() => setStatus((s) => (s === "opening" ? "idle" : s)), 4000);
  }

  return (
    <>
      <button type="button" onClick={chat} className="flex w-full items-center gap-4 py-5 text-left transition-colors hover:text-ink">
        <IconChat className="h-6 w-6 text-ink-2" />
        <span className="flex-1">
          <span className="eyebrow block text-muted">WhatsApp</span>
          <span
            aria-live="polite"
            className={cn("mt-0.5 block text-[15px] text-ink", (status === "idle" || status === "failed") && "link-underline")}
          >
            {LABEL[status]}
          </span>
        </span>
      </button>
      {/* Solves out of sight; the row above shows the progress. */}
      <div hidden>
        <altcha-widget ref={widgetRef} challenge="/api/captcha" display="invisible" />
      </div>
    </>
  );
}
