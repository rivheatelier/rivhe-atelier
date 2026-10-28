import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { sendEmail } from "@/lib/email";
import { emailCodeEmail } from "@/lib/email-templates";
import { loadSettings, updateSettings, type Settings } from "@/lib/settings";
import { deriveSecret, safeEqual } from "@/lib/sign";
import { db } from "@/lib/supabase/admin";

// Store email goes out from the store's own domain, so no inbox password is ever needed.
// The admin chooses where it lands, and a new address takes effect only once the code sent
// to it comes back: a typo can't send new orders or buyers' replies nowhere.

/** The addresses the admin sets this way, and what each one receives. */
export const VERIFIED_EMAILS = {
  sellerEmail: "new orders and payment receipts",
  contactEmail: "buyers’ questions and replies",
} as const;

export type VerifiedEmailField = keyof typeof VERIFIED_EMAILS;

type Pending = { email: string; hash: string; expiresAt: number; sentAt: number; tries: number };
type Outcome = { ok: boolean; error?: string; message?: string; email?: string };

// Waiting codes live in a settings row of their own, apart from the store settings pages read.
const KEY = "email_verification";
const LIFETIME_MINUTES = 15;
const RESEND_AFTER_MS = 60_000;
const MAX_TRIES = 5;

export function isVerifiedEmailField(value: unknown): value is VerifiedEmailField {
  return typeof value === "string" && Object.hasOwn(VERIFIED_EMAILS, value);
}

function hashCode(field: VerifiedEmailField, email: string, code: string): string {
  return createHmac("sha256", deriveSecret("email-code")).update(`${field}:${email}:${code}`).digest("hex");
}

async function loadPending(field: VerifiedEmailField): Promise<Pending | null> {
  const { data, error } = await db().from("settings").select("value").eq("key", KEY).maybeSingle();
  if (error) throw new Error(error.message);
  const pending = (data?.value as Partial<Record<VerifiedEmailField, Pending | null>> | undefined)?.[field];
  return pending?.hash ? pending : null;
}

async function savePending(field: VerifiedEmailField, pending: Pending | null): Promise<void> {
  const { error } = await db().rpc("merge_settings", { p_key: KEY, p_patch: { [field]: pending } });
  if (error) throw new Error(error.message);
}

/** Emails a 6-digit code to `email`. Nothing changes until the code is entered. */
export async function sendEmailCode(field: VerifiedEmailField, email: string): Promise<Outcome> {
  const [settings, previous] = await Promise.all([loadSettings(), loadPending(field)]);
  if (settings[field] === email) {
    return { ok: false, error: "That’s already the address in use. “Send a test email” below checks that it receives mail." };
  }
  if (previous?.email === email && Date.now() - previous.sentAt < RESEND_AFTER_MS) {
    return { ok: false, error: "A code is already on its way. Wait a minute before asking for another." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const sent = await sendEmail({ ...emailCodeEmail(code, VERIFIED_EMAILS[field], LIFETIME_MINUTES), to: email, kind: "email_code" });
  if (sent.status === "logged") return { ok: false, error: "No email service is connected yet, so the code can’t be sent." };
  if (sent.status === "failed") return { ok: false, error: `The code couldn’t be sent: ${sent.error}` };

  const now = Date.now();
  await savePending(field, { email, hash: hashCode(field, email, code), expiresAt: now + LIFETIME_MINUTES * 60_000, sentAt: now, tries: 0 });
  return { ok: true, message: `Code sent to ${email}. It expires in ${LIFETIME_MINUTES} minutes.` };
}

/** Switches to the new address once `code` matches the last one sent. Five wrong tries void it. */
export async function confirmEmailCode(field: VerifiedEmailField, code: string): Promise<Outcome> {
  const pending = await loadPending(field);
  if (!pending) return { ok: false, error: "No code is waiting. Send a new one." };
  if (Date.now() > pending.expiresAt) return { ok: false, error: "That code has expired. Send a new one." };
  if (pending.tries >= MAX_TRIES) return { ok: false, error: "Too many wrong tries. Send a new code." };

  if (!safeEqual(hashCode(field, pending.email, code), pending.hash)) {
    const left = MAX_TRIES - pending.tries - 1;
    await savePending(field, { ...pending, tries: pending.tries + 1 });
    return { ok: false, error: left > 0 ? `That code isn’t right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Send a new code." };
  }

  const patch: Partial<Settings> = {};
  patch[field] = pending.email;
  await updateSettings(patch);
  await savePending(field, null);
  const purpose = VERIFIED_EMAILS[field];
  return { ok: true, email: pending.email, message: `Verified. ${purpose[0].toUpperCase()}${purpose.slice(1)} now come to ${pending.email}.` };
}
