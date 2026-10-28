import "server-only";
import { bankLogo, SWIFT_NOTE } from "@/lib/banks";
import { countryName } from "@/lib/countries";
import { formatIDR, formatUSD } from "@/lib/currency";
import { orderUsdTotal, type Order } from "@/lib/orders";
import type { Settings } from "@/lib/settings";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { formatDateTime } from "@/lib/utils";

// Email clients ignore web fonts and stylesheets, so everything here is inline and table-based.
const C = {
  paper: "#FAF8F5",
  cream: "#F3EFE9",
  line: "#E6E0D7",
  ink: "#2B2927",
  ink2: "#5C5650",
  muted: "#948C82",
  clay: "#A3523F",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Email = { subject: string; html: string };

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(preheader: string, content: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RIVHÉ Atelier</title></head>
<body style="margin:0;padding:0;background:${C.paper}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.line}">
<tr><td align="center" style="padding:34px 24px 6px">
<a href="${siteUrl()}" style="text-decoration:none">
<div style="font-family:${SERIF};font-size:28px;letter-spacing:3px;color:${C.ink};line-height:1">RIVHÉ</div>
<div style="font-family:${SANS};font-size:9px;letter-spacing:5px;color:${C.ink2};margin-top:7px;padding-left:5px">ATELIER</div>
</a>
</td></tr>
<tr><td style="padding:28px 28px 34px;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.ink2}">
${content}
</td></tr>
<tr><td align="center" style="padding:18px 28px;border-top:1px solid ${C.line};font-family:${SANS};font-size:11px;line-height:1.7;color:${C.muted}">
Handmade crochet goods · <a href="${siteUrl()}" style="color:${C.muted}">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const heading = (text: string) =>
  `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:26px;font-weight:normal;line-height:1.25;color:${C.ink}">${esc(text)}</h1>`;
const para = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;
const label = (text: string) =>
  `<div style="margin:30px 0 10px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.ink}">${esc(text)}</div>`;
const button = (href: string, text: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 6px"><tr><td style="background:${C.ink}"><a href="${esc(href)}" style="display:inline-block;padding:13px 28px;font-family:${SANS};font-size:13px;letter-spacing:.4px;color:#ffffff;text-decoration:none">${esc(text)}</a></td></tr></table>`;
const small = (html: string) => `<p style="margin:14px 0 0;font-size:12px;color:${C.muted}">${html}</p>`;

const firstName = (order: Order) => esc(order.name.split(" ")[0] || order.name);
const customerUrl = (order: Order) => `${siteUrl()}/order/${order.code}?t=${order.accessToken}`;
const adminUrl = (order: Order) => `${siteUrl()}/admin/orders/${order.code}`;
const lastTwoDigits = (order: Order) => String(order.transferAmount % 100).padStart(2, "0");

function items(order: Order): string {
  const rows = order.items
    .map(
      (item) => `<tr>
<td width="64" style="padding:8px 0;vertical-align:top">${
        item.image
          ? `<img src="${esc(absoluteUrl(item.image))}" width="64" height="80" alt="" style="display:block;width:64px;height:80px;object-fit:cover;background:${C.cream}">`
          : ""
      }</td>
<td style="padding:8px 0 8px 14px;vertical-align:top;font-size:14px;color:${C.ink}">${esc(item.name)}<div style="margin-top:2px;font-size:12px;color:${C.muted}">One of a kind · ×1</div></td>
<td align="right" style="padding:8px 0;vertical-align:top;font-size:14px;color:${C.ink};white-space:nowrap">${formatIDR(item.price)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totals(order: Order, final: { label: string; amount: number }): string {
  const row = (name: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:13px;color:${strong ? C.ink : C.ink2}">${name}</td><td align="right" style="padding:4px 0;font-size:${strong ? 15 : 13}px;color:${C.ink};white-space:nowrap">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:1px solid ${C.line}">
<tr><td colspan="2" style="height:8px"></td></tr>
${row("Subtotal", formatIDR(order.subtotal))}
${row(`Shipping · ${esc(order.shippingService)}`, formatIDR(order.shippingCost))}
${row(final.label, formatIDR(final.amount), true)}
</table>`;
}

function address(order: Order): string {
  const lines = [
    esc(order.name),
    esc(order.address).replace(/\n/g, "<br>"),
    `${esc(order.city)}${order.province ? `, ${esc(order.province)}` : ""} ${esc(order.postalCode)}`,
    esc(countryName(order.country)),
    esc(order.phone),
  ];
  return `<div style="font-size:13px;line-height:1.7;color:${C.ink2}">${lines.join("<br>")}</div>`;
}

function paymentBox(order: Order, settings: Settings): string {
  const logo = bankLogo(settings.bankName);
  const swift = order.country !== "ID" ? settings.bankSwift : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td style="padding:18px 20px">
${logo ? `<img src="${esc(absoluteUrl(logo.src))}" width="72" height="${Math.round((72 * logo.height) / logo.width)}" alt="" style="display:block;margin-bottom:12px;border:0">` : ""}
<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.ink2}">Bank transfer · ${esc(settings.bankName)}</div>
<div style="margin:6px 0 2px;font-family:${SERIF};font-size:24px;letter-spacing:.5px;color:${C.ink}">${esc(settings.bankAccountNumber)}</div>
<div style="font-size:13px;color:${C.ink2}">${esc(settings.bankAccountName)}</div>
${
  swift
    ? `<div style="margin-top:10px;font-size:13px;color:${C.ink2}">SWIFT code <strong style="font-family:${SERIF};font-size:17px;font-weight:normal;letter-spacing:.5px;color:${C.ink}">${esc(swift)}</strong></div>
<div style="margin-top:4px;font-size:12px;line-height:1.6;color:${C.ink2}">${esc(SWIFT_NOTE)}</div>`
    : ""
}
<div style="height:1px;margin:14px 0;background:${C.line}"></div>
<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.clay}">Transfer exactly</div>
<div style="margin-top:4px;font-family:${SERIF};font-size:28px;color:${C.ink}">${formatIDR(order.transferAmount)}</div>
${order.currency === "USD" ? `<div style="font-size:12px;color:${C.ink2}">≈ ${formatUSD(orderUsdTotal(order))} at the rate locked when you ordered</div>` : ""}
<div style="margin-top:6px;font-size:12px;line-height:1.6;color:${C.ink2}">The last 2 digits must be <strong style="color:${C.clay}">${lastTwoDigits(order)}</strong> so we can match your payment. Please transfer before <strong>${formatDateTime(order.expiresAt)}</strong> — after that the order is cancelled and the piece returns to the shop.</div>
</td></tr></table>`;
}

function customer(order: Order): string {
  return `<div style="font-size:13px;line-height:1.7;color:${C.ink2}">${esc(order.name)}<br><a href="mailto:${esc(order.email)}" style="color:${C.ink2}">${esc(order.email)}</a><br>${esc(order.phone)}</div>`;
}

// --- Buyer -----------------------------------------------------------------

export function orderPlacedBuyer(order: Order, settings: Settings): Email {
  return {
    subject: `Your Order Confirmation #${order.code}`,
    html: layout(
      `Transfer ${formatIDR(order.transferAmount)} to complete your order.`,
      `${heading("Thank you for your order")}
${para(`Hi ${firstName(order)},`)}
${para("Thank you for your purchase! We’re so happy to have you here. Your piece is reserved for you — complete the bank transfer below to confirm your order.")}
${label("Payment")}
${paymentBox(order, settings)}
${label(`Order details · #${order.code}`)}
${items(order)}
${totals(order, { label: "Total", amount: order.total })}
${label("Shipping to")}
${address(order)}
${button(customerUrl(order), "View your order")}
${small("We’ll email your receipt as soon as your payment is confirmed.")}`,
    ),
  };
}

export function receiptBuyer(order: Order, settings: Settings): Email {
  return {
    subject: `Payment Received — Receipt #${order.code}`,
    html: layout(
      `We’ve received your payment for order #${order.code}.`,
      `${heading("Payment received")}
${para(`Hi ${firstName(order)},`)}
${para("We’ve received your payment — thank you! This email is your receipt. We’ll pack your piece with care and send you the tracking number once it ships.")}
${label(`Receipt · #${order.code}`)}
<div style="font-size:12px;color:${C.muted};margin-bottom:6px">Paid ${formatDateTime(order.paidAt)} · Bank transfer ${esc(settings.bankName)}</div>
${items(order)}
${totals(order, { label: "Paid", amount: order.transferAmount })}
${label("Shipping to")}
${address(order)}
<div style="margin-top:8px;font-size:13px;color:${C.ink2}">${esc(order.shippingService)}${order.shippingEta ? ` · ${esc(order.shippingEta)}` : ""}</div>
${button(customerUrl(order), "View your order")}`,
    ),
  };
}

export function shippedBuyer(order: Order): Email {
  return {
    subject: `Your order #${order.code} is on its way`,
    html: layout(
      `Tracking number: ${order.trackingNumber}`,
      `${heading("Your order is on its way")}
${para(`Hi ${firstName(order)},`)}
${para("Your RIVHÉ piece has left the atelier and is on its way to you.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td style="padding:16px 20px;font-size:13px;line-height:1.8;color:${C.ink2}">
Courier: <strong style="color:${C.ink}">${esc(order.shippingService)}</strong><br>
Tracking number: <strong style="color:${C.ink};letter-spacing:.5px">${esc(order.trackingNumber)}</strong>
</td></tr></table>
${label(`Order · #${order.code}`)}
${items(order)}
${button(customerUrl(order), "View your order")}`,
    ),
  };
}

export function cancelledBuyer(order: Order, wasPaid: boolean): Email {
  return {
    subject: `Order #${order.code} has been cancelled`,
    html: layout(
      `Order #${order.code} has been cancelled.`,
      `${heading("Your order was cancelled")}
${para(`Hi ${firstName(order)},`)}
${para(
  wasPaid
    ? `Order #${order.code} has been cancelled. We’ll be in touch about refunding your payment.`
    : `Order #${order.code} has been cancelled. If you think this is a mistake, just reply to this email.`,
)}
${items(order)}`,
    ),
  };
}

// --- Seller ----------------------------------------------------------------

export function orderPlacedSeller(order: Order): Email {
  return {
    subject: `New Order Received #${order.code} — ${formatIDR(order.transferAmount)}`,
    html: layout(
      `Awaiting a transfer of ${formatIDR(order.transferAmount)}.`,
      `${heading("New order received")}
${para(`<strong style="color:${C.ink}">#${order.code}</strong> was just placed and is waiting for a transfer of <strong style="color:${C.ink}">${formatIDR(order.transferAmount)}</strong>. The pieces are reserved until ${formatDateTime(order.expiresAt)}.`)}
${label("Order details")}
${items(order)}
${totals(order, { label: "Expected transfer", amount: order.transferAmount })}
${label("Customer")}
${customer(order)}
${label("Ship to")}
${address(order)}
<div style="margin-top:8px;font-size:13px;color:${C.ink2}">${esc(order.shippingService)}</div>
${order.notes ? `${label("Note from buyer")}${para(esc(order.notes).replace(/\n/g, "<br>"))}` : ""}
${button(adminUrl(order), "Open in admin")}`,
    ),
  };
}

export function receiptSeller(order: Order): Email {
  return {
    subject: `Payment Confirmed #${order.code} — ready to ship`,
    html: layout(
      `${formatIDR(order.transferAmount)} received. Time to pack it up!`,
      `${heading("Payment confirmed")}
${para(`<strong style="color:${C.ink}">#${order.code}</strong> is paid (${formatIDR(order.transferAmount)}). Time to pack it up!`)}
${label("Order details")}
${items(order)}
${totals(order, { label: "Paid", amount: order.transferAmount })}
${label("Ship to")}
${address(order)}
<div style="margin-top:8px;font-size:13px;color:${C.ink2}">${esc(order.shippingService)}</div>
${label("Customer")}
${customer(order)}
${button(adminUrl(order), "Mark as shipped")}`,
    ),
  };
}

export function testEmail(): Email {
  return {
    subject: "Test email from RIVHÉ Atelier",
    html: layout(
      "Your store emails are working.",
      `${heading("It works")}
${para("If you can read this, order emails from your store will reach buyers and your inbox.")}`,
    ),
  };
}
