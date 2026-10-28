"use client";

import { useState, useTransition } from "react";
import { deleteProductAction, saveProductAction } from "@/app/admin/actions";
import { Field } from "@/components/admin/action-form";
import { ImageManager } from "@/components/admin/image-manager";
import { useFormAction } from "@/components/use-form-action";
import { CATEGORIES } from "@/lib/categories";
import { formatIDR, idrFromUsd } from "@/lib/currency";
import type { Product } from "@/lib/products";
import { cn, slugify } from "@/lib/utils";

const STATUSES = [
  { value: "available", label: "Available", hint: "On sale" },
  { value: "draft", label: "Draft", hint: "Hidden" },
  { value: "sold", label: "Sold", hint: "Shown as sold" },
] as const;

export function ProductForm({ product, usdRate }: { product?: Product; usdRate: number }) {
  const [state, form, pending] = useFormAction(saveProductAction, { ok: false });
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [usd, setUsd] = useState(product ? String(product.priceUsd) : "");
  const [status, setStatus] = useState<string>(product?.status === "reserved" ? "available" : (product?.status ?? "available"));

  return (
    <form {...form} className="space-y-4 pb-28 lg:pb-0">
      {product && <input type="hidden" name="id" value={product.id} />}

      <section className="rounded-[4px] border border-line bg-surface p-4 sm:p-5">
        <h2 className="eyebrow mb-4 text-ink">Photos</h2>
        <ImageManager name="images" initial={product?.images ?? []} />
        <p className="mt-3 text-[12px] text-muted">The first photo is the cover. Use the arrows to reorder.</p>
      </section>

      <section className="space-y-4 rounded-[4px] border border-line bg-surface p-4 sm:p-5">
        <h2 className="eyebrow text-ink">Details</h2>
        <Field label="Name" htmlFor="p-name">
          <input
            id="p-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            placeholder="Pastel Horizon Bag"
            className="field"
          />
        </Field>
        <Field
          label="Price (US$)"
          htmlFor="p-price-usd"
          hint={
            Number(usd) > 0 && usdRate > 0
              ? `≈ ${formatIDR(idrFromUsd(Number(usd), usdRate))} today (1 US$ = ${formatIDR(Math.round(usdRate))}). Buyers pay the Rupiah amount at the live rate.`
              : "The Rupiah price follows the live exchange rate automatically."
          }
        >
          <input
            id="p-price-usd"
            name="priceUsd"
            inputMode="decimal"
            value={usd}
            onChange={(e) => setUsd(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""))}
            required
            placeholder="45"
            className="field"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (grams)" htmlFor="p-weight" hint="For shipping cost">
            <input id="p-weight" name="weightGrams" type="number" min={1} defaultValue={product?.weightGrams ?? 500} className="field" />
          </Field>
          <Field label="Category" htmlFor="p-category">
            <select id="p-category" name="category" defaultValue={product?.category || CATEGORIES[0].label} className="field">
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" htmlFor="p-description">
          <textarea
            id="p-description"
            name="description"
            rows={4}
            defaultValue={product?.description ?? ""}
            placeholder="A hand-crocheted bag in a soft palette of pastel hues…"
            className="field"
          />
        </Field>
        <Field label="Story" htmlFor="p-story" hint="Optional. Shown under the description: what inspired the piece, the yarn, how it was made.">
          <textarea id="p-story" name="story" rows={4} defaultValue={product?.story ?? ""} className="field" />
        </Field>
        <Field label="Details — one per line" htmlFor="p-details" hint="Shown as bullet points. “One of a kind — once it’s gone, it’s gone” is added automatically.">
          <textarea
            id="p-details"
            name="details"
            rows={5}
            defaultValue={product?.detailsText ?? "100% handmade\nCotton yarn\nWooden handle\nSize: 28 cm (W) × 20 cm (H)"}
            className="field"
          />
        </Field>
        <Field label="Web address" htmlFor="p-slug" hint={`rivhe.com/products/${slug || "…"}`}>
          <input
            id="p-slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
              setSlugTouched(true);
            }}
            className="field"
          />
        </Field>
      </section>

      <section className="rounded-[4px] border border-line bg-surface p-4 sm:p-5">
        <h2 className="eyebrow mb-4 text-ink">Status</h2>
        {product?.status === "reserved" ? (
          <p className="rounded-[3px] bg-warn-soft px-3 py-2.5 text-[13px] leading-relaxed text-warn">
            Reserved by an unpaid order. It becomes sold when you confirm the payment, or returns to the shop if the order expires.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {STATUSES.map((s) => (
              <label
                key={s.value}
                className={cn(
                  "cursor-pointer rounded-[3px] border px-3 py-2.5 text-center transition-colors",
                  status === s.value ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
                )}
              >
                <input
                  type="radio"
                  name="status"
                  value={s.value}
                  checked={status === s.value}
                  onChange={() => setStatus(s.value)}
                  className="sr-only"
                />
                <span className="block text-[13px]">{s.label}</span>
                <span className={cn("block text-[11px]", status === s.value ? "text-paper/70" : "text-muted")}>{s.hint}</span>
              </label>
            ))}
          </div>
        )}
        {product?.status === "reserved" && <input type="hidden" name="status" value="available" />}
      </section>

      {state.error && (
        <p role="alert" className="rounded-[3px] bg-clay-soft px-4 py-3 text-[13px] text-clay">
          {state.error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <button type="submit" disabled={pending} className="btn-primary w-full lg:w-auto lg:px-12">
          {pending ? "Saving…" : product ? "Save changes" : "Add piece"}
        </button>
      </div>
    </form>
  );
}

export function DeleteProduct({ productId, disabled }: { productId: string; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => {
          if (!window.confirm("Delete this piece permanently? Past orders keep their own copy of its name and price.")) return;
          startTransition(async () => {
            const result = await deleteProductAction(productId);
            if (result && !result.ok) setError(result.error ?? "Couldn’t delete.");
          });
        }}
        className="text-[13px] text-clay underline underline-offset-4 disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete this piece"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
