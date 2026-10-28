"use client";

import type { AltchaWidgetElement } from "altcha";
import type {} from "altcha/types/react";
import { useEffect, useRef } from "react";

// No ALTCHA logo or "Protected by" footer: the checkbox label says what it is.
const CONFIGURATION = JSON.stringify({ hideFooter: true, hideLogo: true });

/**
 * "I'm not a robot" check: an ALTCHA proof of work solved in the browser. It starts when a
 * field in the form gets focus, the form can't be sent until it's done, and the solution
 * travels in a hidden `altcha` field. Each solution is accepted once, so pass a new
 * `attempt` (e.g. the form's action state) after every try.
 */
export function Captcha({ attempt }: { attempt: unknown }) {
  const ref = useRef<HTMLElement>(null);
  const firstAttempt = useRef(attempt);

  useEffect(() => {
    // Defines <altcha-widget>, which only exists in the browser.
    void import("altcha");
  }, []);

  useEffect(() => {
    const widget = ref.current as AltchaWidgetElement | null;
    if (attempt === firstAttempt.current || !widget?.verify) return;
    // The last solution has been used up: start on a fresh one right away.
    widget.reset();
    void widget.verify();
  }, [attempt]);

  return <altcha-widget ref={ref} challenge="/api/captcha" auto="onfocus" configuration={CONFIGURATION} />;
}
