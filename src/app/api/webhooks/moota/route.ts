import { createHmac } from "node:crypto";
import { after } from "next/server";
import { notifyPaymentConfirmed } from "@/lib/notify";
import { confirmPayment, pendingOrdersWithAmount } from "@/lib/orders";
import { releaseExpiredOrders } from "@/lib/products";
import { safeEqual } from "@/lib/sign";
import { db } from "@/lib/supabase/admin";

/**
 * Optional automatic payment matching. Moota (moota.co) watches the BCA account
 * and POSTs new mutations here, signed with HMAC-SHA256 in the `Signature` header.
 * A credit whose amount matches exactly one waiting order confirms it — the
 * unique last two digits make that match reliable. Anything else is recorded for
 * a manual check in the admin.
 */
type Mutation = { amount?: number | string; type?: string; description?: string; mutation_id?: string };

export async function POST(request: Request) {
  const secret = process.env.MOOTA_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 404 });

  const raw = await request.text();
  const signature = request.headers.get("signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (!safeEqual(signature, expected)) return new Response("Invalid signature", { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const mutations: Mutation[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Mutation[] }).data
      : [payload as Mutation];

  await releaseExpiredOrders();
  const results: { amount: number; status: string; order?: string }[] = [];

  for (const mutation of mutations) {
    if (String(mutation.type ?? "").toUpperCase() !== "CR") continue;
    const amount = Math.round(Number(mutation.amount));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    // Record the mutation before matching it. If Moota delivers it again, the unique
    // mutation id stops it from confirming a second order with the same amount.
    const { data: event, error: claimError } = await db()
      .from("payment_events")
      .insert({
        source: "moota",
        external_id: mutation.mutation_id ? String(mutation.mutation_id) : null,
        amount,
        description: String(mutation.description ?? "").slice(0, 500),
        status: "unmatched",
        raw: mutation,
      })
      .select("id")
      .single();
    if (claimError) {
      if (claimError.code === "23505") {
        results.push({ amount, status: "duplicate" });
        continue;
      }
      console.error("[moota] could not record mutation:", claimError.message);
      return new Response("Could not record the mutation", { status: 500 });
    }

    const candidates = await pendingOrdersWithAmount(amount);
    let status: "matched" | "unmatched" | "ambiguous" = candidates.length === 1 ? "matched" : candidates.length > 1 ? "ambiguous" : "unmatched";
    let matchedOrderId: string | null = null;

    if (status === "matched") {
      try {
        await confirmPayment(candidates[0].id);
        matchedOrderId = candidates[0].id;
        after(() => notifyPaymentConfirmed(candidates[0].id));
      } catch (error) {
        console.error("[moota] could not confirm", candidates[0].code, error);
        status = "unmatched";
      }
    }

    if (status !== "unmatched") {
      await db().from("payment_events").update({ status, matched_order_id: matchedOrderId }).eq("id", event.id);
    }
    results.push({ amount, status, order: status === "matched" ? candidates[0].code : undefined });
  }

  return Response.json({ ok: true, results });
}
