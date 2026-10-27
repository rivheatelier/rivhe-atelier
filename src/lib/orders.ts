import "server-only";
import type { CurrencyCode } from "@/lib/currency";
import { db } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/sign";
import type { AddressInput } from "@/lib/validation";
import type { ShippingOption } from "@/lib/shipping-types";

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "completed" | "expired" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  slug: string;
  /** Rupiah charged for this piece. */
  price: number;
  /** The dollar price the buyer saw (null on orders from before USD pricing). */
  priceUsd: number | null;
  image: string;
};

export type Order = {
  id: string;
  code: string;
  accessToken: string;
  status: OrderStatus;
  email: string;
  name: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  shippingService: string;
  shippingEta: string;
  shippingCost: number;
  subtotal: number;
  total: number;
  transferAmount: number;
  currency: string;
  currencyRate: number;
  trackingNumber: string;
  adminNote: string;
  expiresAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: OrderItem[];
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  name: string;
  slug: string;
  price: number;
  price_usd: number | string | null;
  image: string;
};

type OrderRow = {
  id: string;
  code: string;
  access_token: string;
  status: OrderStatus;
  email: string;
  name: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  notes: string;
  shipping_service: string;
  shipping_eta: string;
  shipping_cost: number;
  subtotal: number;
  total: number;
  transfer_amount: number;
  currency: string;
  currency_rate: number | string;
  tracking_number: string;
  admin_note: string;
  expires_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  order_items?: OrderItemRow[];
};

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    code: row.code,
    accessToken: row.access_token,
    status: row.status,
    email: row.email,
    name: row.name,
    phone: row.phone,
    country: row.country,
    address: row.address,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    notes: row.notes,
    shippingService: row.shipping_service,
    shippingEta: row.shipping_eta,
    shippingCost: row.shipping_cost,
    subtotal: row.subtotal,
    total: row.total,
    transferAmount: row.transfer_amount,
    currency: row.currency,
    currencyRate: Number(row.currency_rate),
    trackingNumber: row.tracking_number,
    adminNote: row.admin_note,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      priceUsd: item.price_usd == null ? null : Number(item.price_usd),
      image: item.image,
    })),
  };
}

/** The order total in US dollars as the buyer saw it: dollar prices plus shipping at the locked rate. */
export function orderUsdTotal(order: Order): number {
  const rate = order.currencyRate > 0 ? order.currencyRate : 1;
  const items = order.items.reduce((sum, item) => sum + (item.priceUsd ?? item.price / rate), 0);
  return Math.round((items + order.shippingCost / rate) * 100) / 100;
}

const WITH_ITEMS = "*, order_items(*)";

/** Accepts "RIVHE1001", "#rivhe1001" or just "1001". */
export function normalizeOrderCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/^#/, "");
  return /^\d+$/.test(cleaned) ? `RIVHE${cleaned}` : cleaned;
}

export async function getOrderByCode(code: string): Promise<Order | null> {
  const { data, error } = await db().from("orders").select(WITH_ITEMS).eq("code", normalizeOrderCode(code)).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOrder(data as OrderRow) : null;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await db().from("orders").select(WITH_ITEMS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOrder(data as OrderRow) : null;
}

/** Buyers reach their order through the secret link in their email. */
export async function getOrderForCustomer(code: string, token: string | undefined): Promise<Order | null> {
  if (!token) return null;
  const order = await getOrderByCode(code);
  if (!order || !safeEqual(order.accessToken, token)) return null;
  return order;
}

export async function findOrderByCodeAndEmail(code: string, email: string): Promise<Order | null> {
  const order = await getOrderByCode(code);
  if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  return order;
}

export async function listOrders(options: { statuses?: OrderStatus[]; limit?: number } = {}): Promise<Order[]> {
  let query = db().from("orders").select(WITH_ITEMS).order("created_at", { ascending: false });
  if (options.statuses?.length) query = query.in("status", options.statuses);
  query = query.limit(options.limit ?? 100);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as OrderRow[] | null) ?? []).map(toOrder);
}

export async function countOrders(status: OrderStatus): Promise<number> {
  const { count, error } = await db().from("orders").select("id", { count: "exact", head: true }).eq("status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function paidOrdersSince(iso: string): Promise<{ count: number; revenue: number }> {
  const { data, error } = await db()
    .from("orders")
    .select("subtotal")
    .in("status", ["paid", "shipped", "completed"])
    .gte("paid_at", iso);
  if (error) throw new Error(error.message);
  const list = (data as { subtotal: number }[] | null) ?? [];
  return { count: list.length, revenue: list.reduce((sum, o) => sum + o.subtotal, 0) };
}

// --- Lifecycle -------------------------------------------------------------

/** Error codes raised by the database functions in supabase/migrations. */
export class OrderError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const KNOWN_ERRORS = [
  "CART_EMPTY",
  "ITEM_UNAVAILABLE",
  "ORDER_NOT_FOUND",
  "INVALID_STATUS",
  "INVALID_SHIPPING",
  "INVALID_SUFFIX",
  "INVALID_RATE",
  "INVALID_PRICE",
];

function orderError(message: string): Error {
  const code = KNOWN_ERRORS.find((known) => message.includes(known));
  return code ? new OrderError(code) : new Error(message);
}

export async function placeOrder(params: {
  /** Each piece priced by the server at the locked rate. */
  items: { id: string; priceIdr: number; priceUsd: number }[];
  address: AddressInput;
  shipping: ShippingOption;
  paymentSuffix: number;
  reservationHours: number;
  currency: CurrencyCode;
  /** Rupiah per US dollar the buyer was shown. */
  usdRate: number;
}): Promise<{ id: string; code: string; accessToken: string }> {
  const a = params.address;
  const { data, error } = await db().rpc("place_order", {
    p_items: params.items.map((item) => ({ id: item.id, price_idr: item.priceIdr, price_usd: item.priceUsd })),
    p_customer: {
      email: a.email,
      name: a.name,
      phone: a.phone,
      country: a.country,
      address: a.address,
      city: a.city,
      province: a.province,
      postal_code: a.postalCode,
      notes: a.notes,
    },
    p_shipping: {
      service: `${params.shipping.courier} ${params.shipping.service}`.trim(),
      eta: params.shipping.eta,
      cost: params.shipping.price,
    },
    p_payment_suffix: params.paymentSuffix,
    p_reservation_hours: params.reservationHours,
    p_currency: params.currency,
    p_usd_rate: params.usdRate,
  });
  if (error) throw orderError(error.message);
  const result = data as { id: string; code: string; access_token: string };
  return { id: result.id, code: result.code, accessToken: result.access_token };
}

export async function confirmPayment(orderId: string): Promise<void> {
  const { error } = await db().rpc("confirm_order_payment", { p_order_id: orderId });
  if (error) throw orderError(error.message);
}

export async function cancelOrder(orderId: string, restock: boolean): Promise<void> {
  const { error } = await db().rpc("cancel_order", { p_order_id: orderId, p_restock: restock });
  if (error) throw orderError(error.message);
}

async function transition(orderId: string, from: OrderStatus, values: Record<string, unknown>): Promise<void> {
  const { data, error } = await db().from("orders").update(values).eq("id", orderId).eq("status", from).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new OrderError("INVALID_STATUS");
}

export async function markShipped(orderId: string, trackingNumber: string): Promise<void> {
  await transition(orderId, "paid", {
    status: "shipped",
    tracking_number: trackingNumber,
    shipped_at: new Date().toISOString(),
  });
}

export async function markCompleted(orderId: string): Promise<void> {
  await transition(orderId, "shipped", { status: "completed", completed_at: new Date().toISOString() });
}

export async function updateOrderNote(orderId: string, note: string): Promise<void> {
  const { error } = await db().from("orders").update({ admin_note: note }).eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string): Promise<void> {
  const { error } = await db().from("orders").update({ tracking_number: trackingNumber }).eq("id", orderId);
  if (error) throw new Error(error.message);
}

// --- Bank transfer matching (used by the Moota webhook) ---

export async function pendingOrdersWithAmount(amount: number): Promise<{ id: string; code: string }[]> {
  const { data, error } = await db()
    .from("orders")
    .select("id, code")
    .eq("status", "pending_payment")
    .eq("transfer_amount", amount);
  if (error) throw new Error(error.message);
  return (data as { id: string; code: string }[] | null) ?? [];
}

export type EmailLogEntry = {
  id: string;
  kind: string;
  toEmail: string;
  subject: string;
  status: "sent" | "failed" | "logged";
  error: string;
  createdAt: string;
};

export async function listOrderEmails(orderId: string): Promise<EmailLogEntry[]> {
  const { data, error } = await db()
    .from("email_log")
    .select("id, kind, to_email, subject, status, error, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as Record<string, string>[] | null) ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    toEmail: r.to_email,
    subject: r.subject,
    status: r.status as EmailLogEntry["status"],
    error: r.error,
    createdAt: r.created_at,
  }));
}
