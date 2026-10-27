"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/(store)/actions";
import type { ProductStatus } from "@/lib/products";

export function AddToCart({
  productId,
  status,
  inCart,
  reservationHours,
}: {
  productId: string;
  status: ProductStatus;
  inCart: boolean;
  reservationHours: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "sold") {
    return (
      <button type="button" disabled className="btn-primary w-full">
        Sold out
      </button>
    );
  }

  if (status === "reserved") {
    return (
      <div>
        <button type="button" disabled className="btn-primary w-full">
          Reserved
        </button>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Someone is completing their purchase of this piece. If their payment doesn’t arrive within {reservationHours} hours, it returns to
          the shop.
        </p>
      </div>
    );
  }

  if (inCart) {
    return (
      <div className="grid gap-3">
        <Link href="/cart" className="btn-primary w-full">
          In your cart — Checkout
        </Link>
        <p className="text-center text-[12px] text-muted">One of a kind, so it’s just this one.</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await addToCartAction(productId);
            if (!result.ok) setError(result.error);
          })
        }
        className="btn-primary w-full"
      >
        {pending ? "Adding…" : "Add to cart"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
