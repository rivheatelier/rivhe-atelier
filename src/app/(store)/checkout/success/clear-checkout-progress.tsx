"use client";

import { useEffect } from "react";

/** The order is placed, so the saved checkout progress for this tab is no longer needed. */
export function ClearCheckoutProgress() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("rivhe_checkout");
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }, []);
  return null;
}
