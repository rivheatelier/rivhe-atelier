"use client";

import { trackOrderAction } from "@/app/(store)/actions";
import { useFormAction } from "@/components/use-form-action";

export function TrackForm() {
  const [state, form, pending] = useFormAction(trackOrderAction, {});

  return (
    <form {...form} className="mt-9 space-y-4">
      <div>
        <label htmlFor="track-code" className="field-label">
          Order number
        </label>
        <input id="track-code" name="code" required placeholder="RIVHE1001" autoCapitalize="characters" className="field" />
      </div>
      <div>
        <label htmlFor="track-email" className="field-label">
          Email
        </label>
        <input id="track-email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-[2px] bg-clay-soft px-4 py-3 text-[13px] text-clay">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Looking…" : "Find my order"}
      </button>
    </form>
  );
}
