"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-serif text-[34px] leading-tight">Something went wrong</h1>
      <p className="mt-3 text-[14px] text-ink-2">Please try again in a moment.</p>
      <div className="mt-8 flex flex-col items-center gap-5">
        <button type="button" onClick={reset} className="btn-primary px-10">
          Try again
        </button>
        <Link href="/" className="link-underline text-[13px]">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
