"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { isAdminEmail, requireAdmin } from "@/lib/auth";
import { isCategoryLabel } from "@/lib/categories";
import { formatIDR } from "@/lib/currency";
import { refreshUsdRate } from "@/lib/exchange-rate";
import { sendEmail } from "@/lib/email";
import { testEmail } from "@/lib/email-templates";
import { confirmEmailCode, isVerifiedEmailField, sendEmailCode } from "@/lib/email-verification";
import { notifyCancelled, notifyPaymentConfirmed, notifyShipped } from "@/lib/notify";
import {
  cancelOrder,
  confirmPayment,
  markCompleted,
  markShipped,
  OrderError,
  updateOrderNote,
  updateTrackingNumber,
} from "@/lib/orders";
import { EDITABLE_PAGES, resetPage, savePage } from "@/lib/pages";
import { adminDeleteProduct, adminSaveProduct, type ProductInput } from "@/lib/products";
import { loadSettings, updateSettings, type Settings } from "@/lib/settings";
import type { IntlCarrier } from "@/lib/shipping-types";
import { createAuthClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const done = (message: string): ActionResult => ({ ok: true, message });

function refreshEverywhere() {
  revalidatePath("/", "layout");
}

function orderErrorMessage(error: unknown): string {
  if (error instanceof OrderError) {
    switch (error.code) {
      case "ITEM_UNAVAILABLE":
        return "A piece in this order has since been bought by someone else, so it can’t be confirmed. Refund the buyer if they paid.";
      case "INVALID_STATUS":
        return "This order has already changed — refresh the page.";
      case "ORDER_NOT_FOUND":
        return "Order not found.";
    }
  }
  console.error("[admin]", error);
  return error instanceof Error ? error.message : "Something went wrong.";
}

// --- Sign in ---------------------------------------------------------------

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return fail("Enter your email and password.");

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase only reports these after checking the password, so they don't reveal which emails exist.
    if (error.code === "email_not_confirmed") return fail("This account isn’t confirmed yet. Confirm it in Supabase → Authentication → Users.");
    if (error.status === 429) return fail("Too many sign-in attempts. Wait a few minutes, then try again.");
    if (error.code !== "invalid_credentials") console.error("[admin] sign-in failed:", error.code, error.message);
    return fail("Incorrect email or password.");
  }
  if (!isAdminEmail(email)) {
    await supabase.auth.signOut();
    return fail("This account isn’t on the admin list. Add the email to ADMIN_EMAILS.");
  }
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return fail("Use at least 8 characters.");
  if (password !== String(formData.get("confirm") ?? "")) return fail("The two passwords don’t match.");
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.message);
  return done("Password updated.");
}

// --- Products --------------------------------------------------------------

function parseImageList(value: FormDataEntryValue | null, max: number): string[] {
  try {
    const list = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(list)) return [];
    return list.filter((url): url is string => typeof url === "string" && /^(https?:\/\/|\/)/.test(url)).slice(0, max);
  } catch {
    return [];
  }
}

export async function saveProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "") || undefined;
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  // "45,50" is how a price is often typed in Indonesia: treat the comma as the decimal point.
  const priceUsd = Math.round(Number(String(formData.get("priceUsd") ?? "").replace(",", ".").replace(/[^\d.]/g, "")) * 100) / 100;
  const weightGrams = Math.round(Number(formData.get("weightGrams") ?? 0));
  const status = String(formData.get("status") ?? "draft") as ProductInput["status"];
  const images = parseImageList(formData.get("images"), 12);
  const category = String(formData.get("category") ?? "");

  if (!name) return fail("Give the piece a name.");
  if (!slug) return fail("The URL needs at least one letter or number.");
  if (!(priceUsd > 0)) return fail("Enter the price in US dollars, e.g. 45.");
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) return fail("Enter the weight in grams — it’s used to calculate shipping.");
  if (!isCategoryLabel(category)) return fail("Choose a category.");
  if (!["draft", "available", "sold"].includes(status)) return fail("Choose a status.");
  if (status === "available" && images.length === 0) return fail("Add at least one photo before putting a piece on sale.");

  let savedId: string;
  try {
    const saved = await adminSaveProduct(
      {
        name,
        slug,
        priceUsd,
        weightGrams,
        status,
        images,
        category,
        description: String(formData.get("description") ?? "").trim().slice(0, 4000),
        story: String(formData.get("story") ?? "").trim().slice(0, 4000),
        details: String(formData.get("details") ?? "").trim().slice(0, 2000),
      },
      id,
    );
    savedId = saved.id;
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_TAKEN") return fail("Another piece already uses this URL. Change the URL field.");
    if (error instanceof Error && error.message === "STATUS_CHANGED") {
      return fail("A buyer has just reserved this piece, so its status can’t be changed now. Reload the page.");
    }
    return fail(error instanceof Error ? error.message : "Couldn’t save.");
  }

  refreshEverywhere();
  redirect(`/admin/products/${savedId}?saved=1`);
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await adminDeleteProduct(productId);
  } catch (error) {
    if (error instanceof Error && error.message === "RESERVED") return fail("This piece is reserved by an unpaid order. Cancel that order first.");
    return fail(error instanceof Error ? error.message : "Couldn’t delete.");
  }
  refreshEverywhere();
  redirect("/admin/products?deleted=1");
}

// --- Orders ----------------------------------------------------------------

export async function confirmPaymentAction(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await confirmPayment(orderId);
  } catch (error) {
    return fail(orderErrorMessage(error));
  }
  after(() => notifyPaymentConfirmed(orderId));
  refreshEverywhere();
  return done("Payment confirmed. The receipt is on its way to the buyer and to you.");
}

export async function markShippedAction(orderId: string, trackingNumber: string): Promise<ActionResult> {
  await requireAdmin();
  const tracking = trackingNumber.trim().slice(0, 60);
  if (!tracking) return fail("Enter the tracking number (resi).");
  try {
    await markShipped(orderId, tracking);
  } catch (error) {
    return fail(orderErrorMessage(error));
  }
  after(() => notifyShipped(orderId));
  refreshEverywhere();
  return done("Marked as shipped. The buyer has been emailed the tracking number.");
}

export async function updateTrackingAction(orderId: string, trackingNumber: string): Promise<ActionResult> {
  await requireAdmin();
  await updateTrackingNumber(orderId, trackingNumber.trim().slice(0, 60));
  refreshEverywhere();
  return done("Tracking number updated.");
}

export async function markCompletedAction(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await markCompleted(orderId);
  } catch (error) {
    return fail(orderErrorMessage(error));
  }
  refreshEverywhere();
  return done("Order completed.");
}

export async function cancelOrderAction(orderId: string, options: { restock: boolean; notify: boolean }): Promise<ActionResult> {
  await requireAdmin();
  let previousStatus: string;
  try {
    ({ previousStatus } = await cancelOrder(orderId, options.restock));
  } catch (error) {
    return fail(orderErrorMessage(error));
  }
  if (options.notify) after(() => notifyCancelled(orderId, previousStatus === "paid"));
  refreshEverywhere();
  return done("Order cancelled.");
}

export async function saveOrderNoteAction(orderId: string, note: string): Promise<ActionResult> {
  await requireAdmin();
  await updateOrderNote(orderId, note.trim().slice(0, 2000));
  refreshEverywhere();
  return done("Note saved.");
}

// --- Pages -----------------------------------------------------------------

export async function savePageAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").slice(0, 20000);
  if (!EDITABLE_PAGES.includes(slug)) return fail("Unknown page.");
  if (!title) return fail("Give the page a title.");
  await savePage(slug, title, body);
  revalidatePath(`/${slug}`);
  revalidatePath("/admin/pages", "layout");
  return done("Page saved.");
}

export async function resetPageAction(slug: string): Promise<void> {
  await requireAdmin();
  if (!EDITABLE_PAGES.includes(slug)) return;
  await resetPage(slug);
  revalidatePath(`/${slug}`);
  redirect(`/admin/pages/${slug}?reset=1`);
}

// --- Settings --------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Bank, country, location, then an optional branch: 8 or 11 characters.
const SWIFT = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const text = (key: string, max = 300) => String(formData.get(key) ?? "").trim().slice(0, max);
  // Digits only: "450.000" (Indonesian thousands separator) must read as 450000, not 450.
  const int = (key: string) => {
    const digits = String(formData.get(key) ?? "").replace(/\D/g, "");
    return digits ? Number(digits) : Number.NaN;
  };
  const checked = (key: string) => formData.get(key) === "on";

  let patch: Partial<Settings>;
  switch (formData.get("section")) {
    case "store": {
      // The two email addresses are changed under Email, each confirmed with a code.
      patch = {
        storeName: text("storeName", 80) || "RIVHÉ Atelier",
        tagline: text("tagline", 120),
        heroSubtitle: text("heroSubtitle", 160),
        whatsapp: text("whatsapp", 24),
        instagram: text("instagram", 60).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, ""),
      };
      break;
    }
    case "hero": {
      const heroImages = parseImageList(formData.get("heroImages"), 5);
      if (heroImages.length === 0) return fail("Keep at least one homepage photo.");
      patch = { heroImages };
      break;
    }
    case "bank": {
      const paymentSuffix = int("paymentSuffix");
      const reservationHours = int("reservationHours");
      const bankSwift = text("bankSwift", 40).replace(/\s+/g, "").toUpperCase();
      if (!(paymentSuffix >= 0 && paymentSuffix <= 99)) return fail("The unique ending must be two digits (00–99).");
      if (!(reservationHours >= 1 && reservationHours <= 168)) return fail("The payment window must be between 1 and 168 hours.");
      if (!text("bankName")) return fail("Enter the bank name.");
      if (!text("bankAccountNumber")) return fail("Enter the account number.");
      if (bankSwift && !SWIFT.test(bankSwift)) return fail("A SWIFT code has 8 or 11 letters and digits, e.g. BMRIIDJA.");
      patch = {
        bankName: text("bankName", 40),
        bankAccountNumber: text("bankAccountNumber", 40),
        bankAccountName: text("bankAccountName", 80),
        bankSwift,
        paymentSuffix,
        reservationHours,
      };
      break;
    }
    case "shipping": {
      const originPostalCode = text("originPostalCode", 5);
      if (!/^\d{5}$/.test(originPostalCode)) return fail("The origin postal code must have 5 digits.");
      const carrier = (id: IntlCarrier) => ({
        enabled: checked(`carrier_${id}`),
        ratePerKg: { asean: int(`intl_${id}_asean`), asiaPacific: int(`intl_${id}_asiaPacific`), world: int(`intl_${id}_world`) },
      });
      const intlCarriers = { dhl: carrier("dhl"), aramex: carrier("aramex") };
      const offered = Object.values(intlCarriers).filter((c) => c.enabled);
      if (offered.some((c) => Object.values(c.ratePerKg).some((rate) => !(rate > 0)))) {
        return fail("Enter a rate for every zone of each international courier you offer.");
      }
      if (checked("internationalShipping") && offered.length === 0) {
        return fail("Switch on DHL Express or Aramex, or turn international shipping off.");
      }
      patch = {
        originPostalCode,
        originCity: text("originCity", 80),
        couriers: text("couriers", 120).toLowerCase().replace(/\s+/g, "") || "jne,sicepat",
        internationalShipping: checked("internationalShipping"),
        intlCarriers,
      };
      break;
    }
    case "product": {
      patch = { shippingNote: text("shippingNote", 600), careNote: text("careNote", 600) };
      break;
    }
    default:
      return fail("Unknown section.");
  }

  await updateSettings(patch);
  refreshEverywhere();
  return done("Saved.");
}

/** Pulls a fresh USD→IDR rate right away (it also refreshes on its own every 10 minutes). */
export async function refreshRatesAction(): Promise<ActionResult> {
  await requireAdmin();
  const latest = await refreshUsdRate();
  if (!latest) return fail("Couldn’t reach any exchange-rate service. The last known rate stays in use.");
  refreshEverywhere();
  return done(`1 US$ = ${formatIDR(Math.round(latest.rate))} (${latest.source}).`);
}

export async function sendTestEmailAction(): Promise<ActionResult> {
  const admin = await requireAdmin();
  const settings = await loadSettings();
  const to = settings.sellerEmail || admin.email;
  const result = await sendEmail({ ...testEmail(), to, kind: "test" });
  if (result.status === "sent") return done(`Test email sent to ${to}.`);
  if (result.status === "logged") {
    return fail("No email provider is set up yet (RESEND_API_KEY or SMTP_URL), so emails are only recorded in each order.");
  }
  return fail(`Sending failed: ${result.error}`);
}

/** Step 1 of changing a store email address: a code goes to the new one. */
export async function sendEmailCodeAction(field: string, email: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isVerifiedEmailField(field)) return fail("Unknown email setting.");
  const address = String(email ?? "").trim().toLowerCase().slice(0, 160);
  if (!EMAIL.test(address)) return fail("That email address doesn’t look right.");
  return sendEmailCode(field, address);
}

/** Step 2: the code from that email switches the setting to the new address. */
export async function verifyEmailCodeAction(field: string, code: string): Promise<ActionResult & { email?: string }> {
  await requireAdmin();
  if (!isVerifiedEmailField(field)) return fail("Unknown email setting.");
  const digits = String(code ?? "").replace(/\D/g, "");
  if (digits.length !== 6) return fail("Enter the 6-digit code from the email.");
  const result = await confirmEmailCode(field, digits);
  if (result.ok) refreshEverywhere();
  return result;
}
