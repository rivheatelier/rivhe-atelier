import "server-only";
import { cache } from "react";
import { db } from "@/lib/supabase/admin";

export type PageContent = { slug: string; title: string; body: string; updatedAt: string | null };

// Starting copy for the editable pages. Once a page is saved in /admin/pages,
// the database version is shown instead.
export const PAGE_DEFAULTS: Record<string, { title: string; body: string }> = {
  about: {
    title: "About",
    body: `RIVHÉ Atelier is a small crochet studio making bags and accessories by hand, one stitch at a time.

Every piece begins with a single strand of cotton yarn and a colour story — a sunset, a seaside morning, a garden after rain. We work each one slowly, row by row, and finish it with natural details like hand-wrapped wooden handles.

## One of a kind, on purpose
We make only one piece per colour and model. When it's gone, it's gone — and the next one will tell a different story.

## Made in Indonesia
Every piece is designed and crocheted in our studio in Indonesia, then packed with care and sent to you.`,
  },
  "shipping-returns": {
    title: "Shipping & Returns",
    body: `## Processing
Orders are packed and shipped within 1–3 working days after your payment is confirmed. You'll receive an email with your tracking number as soon as your piece is on its way.

## Shipping within Indonesia
Shipping is calculated at checkout from your postal code, with couriers such as JNE and SiCepat. Delivery usually takes 1–5 working days depending on your area.

## International shipping
We ship worldwide with DHL Express and Aramex, booked through Pos Indonesia. Shipping is calculated at checkout by destination and weight: DHL Express usually arrives in 3–7 working days, Aramex in 5–10. Any import duties or taxes are paid by the recipient.

## Returns
Because every piece is handmade and one of a kind, all sales are final. If your order arrives damaged, contact us within 3 days of delivery with photos of the item and its packaging, and we'll make it right.`,
  },
  care: {
    title: "Care Guide",
    body: `Crochet is durable, but it loves a little care.

- Spot clean with a damp cloth and mild soap.
- If needed, hand wash gently in cold water — never wring or twist.
- Reshape while damp and dry flat in the shade.
- Keep away from sharp objects that could snag the yarn.
- Store stuffed with tissue paper to keep its shape, away from direct sunlight.

## Wooden handles
Wipe clean with a dry cloth and keep them away from prolonged moisture.`,
  },
  terms: {
    title: "Terms & Conditions",
    body: `By placing an order with RIVHÉ Atelier you agree to the following terms.

## Handmade, one of a kind
Every item is handmade and unique. Small variations in colour, size and stitching are part of its character, not defects. Colours may look slightly different depending on your screen.

## Orders and payment
- We don't take pre-orders. Only pieces shown as available can be purchased.
- Prices are set in US dollars. Payment is by bank transfer in Indonesian Rupiah (IDR), converted at the live exchange rate when you check out; the IDR amount shown at checkout is final.
- Please transfer the exact amount shown — its last two digits help us match your payment.
- Your piece is reserved for 24 hours after you place your order. If payment isn't received in time, the order is cancelled automatically and the piece returns to the shop.

## Shipping
Shipping costs are calculated at checkout. We're not responsible for delays caused by couriers or customs. Import duties and taxes on international orders are paid by the recipient.

## Final sale
All items are final sale. If your order arrives damaged, contact us within 3 days of delivery with photos and we'll work with you on a solution.

## Contact
Questions? Reach us through our [contact page](/contact).`,
  },
};

export const EDITABLE_PAGES = Object.keys(PAGE_DEFAULTS);

export const getPage = cache(async (slug: string): Promise<PageContent | null> => {
  const fallback = PAGE_DEFAULTS[slug];
  if (!fallback) return null;
  const { data, error } = await db().from("pages").select("slug, title, body, updated_at").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { slug, ...fallback, updatedAt: null };
  const row = data as { slug: string; title: string; body: string; updated_at: string };
  return { slug: row.slug, title: row.title, body: row.body, updatedAt: row.updated_at };
});

export async function savePage(slug: string, title: string, body: string): Promise<void> {
  if (!PAGE_DEFAULTS[slug]) throw new Error("Unknown page");
  const { error } = await db().from("pages").upsert({ slug, title, body });
  if (error) throw new Error(error.message);
}

export async function resetPage(slug: string): Promise<void> {
  const { error } = await db().from("pages").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}
