"use client";

import { useTransition } from "react";
import { removeFromCartAction } from "@/app/(store)/actions";
import { IconTrash } from "@/components/icons";

export function RemoveFromCart({ productId, name }: { productId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeFromCartAction(productId))}
      className="grid h-10 w-10 place-items-center text-ink-2 transition-colors hover:text-ink disabled:opacity-40"
      aria-label={`Remove ${name} from cart`}
    >
      <IconTrash className="h-5 w-5" />
    </button>
  );
}
