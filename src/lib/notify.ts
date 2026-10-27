import "server-only";
import { adminEmails } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import * as templates from "@/lib/email-templates";
import { getOrderById, type Order } from "@/lib/orders";
import { loadSettings, type Settings } from "@/lib/settings";

// These run inside `after()`, once the response has been sent, so a slow email
// provider never delays the buyer or the admin.

function sellerInbox(settings: Settings): string | null {
  return settings.sellerEmail || adminEmails()[0] || null;
}

async function withOrder(orderId: string, task: (order: Order, settings: Settings) => Promise<void>): Promise<void> {
  try {
    const [order, settings] = await Promise.all([getOrderById(orderId), loadSettings()]);
    if (order) await task(order, settings);
  } catch (error) {
    console.error(`[notify] order ${orderId}:`, error);
  }
}

/** "Your Order Confirmation" to the buyer (with transfer details) and "New Order Received" to the seller. */
export function notifyOrderPlaced(orderId: string): Promise<void> {
  return withOrder(orderId, async (order, settings) => {
    await sendEmail({
      ...templates.orderPlacedBuyer(order, settings),
      to: order.email,
      kind: "order_placed_buyer",
      orderId,
      replyTo: settings.contactEmail || undefined,
    });
    const seller = sellerInbox(settings);
    if (seller) {
      await sendEmail({ ...templates.orderPlacedSeller(order), to: seller, kind: "order_placed_seller", orderId, replyTo: order.email });
    }
  });
}

/** The receipt, once the transfer has been matched — to both buyer and seller. */
export function notifyPaymentConfirmed(orderId: string): Promise<void> {
  return withOrder(orderId, async (order, settings) => {
    await sendEmail({
      ...templates.receiptBuyer(order, settings),
      to: order.email,
      kind: "receipt_buyer",
      orderId,
      replyTo: settings.contactEmail || undefined,
    });
    const seller = sellerInbox(settings);
    if (seller) {
      await sendEmail({ ...templates.receiptSeller(order), to: seller, kind: "receipt_seller", orderId, replyTo: order.email });
    }
  });
}

export function notifyShipped(orderId: string): Promise<void> {
  return withOrder(orderId, async (order, settings) => {
    await sendEmail({
      ...templates.shippedBuyer(order),
      to: order.email,
      kind: "shipped_buyer",
      orderId,
      replyTo: settings.contactEmail || undefined,
    });
  });
}

export function notifyCancelled(orderId: string, wasPaid: boolean): Promise<void> {
  return withOrder(orderId, async (order, settings) => {
    await sendEmail({
      ...templates.cancelledBuyer(order, wasPaid),
      to: order.email,
      kind: "cancelled_buyer",
      orderId,
      replyTo: settings.contactEmail || undefined,
    });
  });
}
