import "server-only";
import { db } from "@/lib/supabase/admin";

export type EmailKind =
  | "order_placed_buyer"
  | "order_placed_seller"
  | "receipt_buyer"
  | "receipt_seller"
  | "shipped_buyer"
  | "cancelled_buyer"
  | "email_code"
  | "test";

type Message = {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
  orderId?: string | null;
  replyTo?: string;
};

export type EmailStatus = "sent" | "failed" | "logged";

export function emailProvider(): "resend" | "smtp" | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_URL) return "smtp";
  return null;
}

/** EMAIL_FROM, else the SMTP login (Gmail only sends as the signed-in address), else hello@rivhe.com. */
export function emailSender(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY && process.env.SMTP_URL) {
    try {
      const user = decodeURIComponent(new URL(process.env.SMTP_URL).username);
      if (user.includes("@")) return `RIVHÉ Atelier <${user}>`;
    } catch {
      // Malformed SMTP_URL: sending will report the real error.
    }
  }
  return "RIVHÉ Atelier <hello@rivhe.com>";
}

/**
 * Sends through Resend or SMTP when configured. Every message is also written to
 * email_log so the admin can see (and preview) what each buyer received — without
 * a provider, emails are only logged there.
 */
export async function sendEmail(message: Message): Promise<{ status: EmailStatus; error?: string }> {
  const provider = emailProvider();
  let status: EmailStatus = "logged";
  let error = "";

  if (provider) {
    try {
      if (provider === "resend") await sendWithResend(message);
      else await sendWithSmtp(message);
      status = "sent";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      console.error(`[email] ${message.kind} → ${message.to} failed:`, error);
    }
  } else {
    console.info(`[email] no provider configured; logged ${message.kind} → ${message.to}: ${message.subject}`);
  }

  const { error: logError } = await db().from("email_log").insert({
    order_id: message.orderId ?? null,
    kind: message.kind,
    to_email: message.to,
    subject: message.subject,
    html: message.html,
    status,
    provider: provider ?? "",
    error,
  });
  if (logError) console.error("[email] could not write email_log:", logError.message);

  return { status, error: error || undefined };
}

async function sendWithResend(message: Message): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: emailSender(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

type Mailer = { sendMail(options: Record<string, unknown>): Promise<unknown> };
let mailer: Promise<Mailer> | undefined;

async function sendWithSmtp(message: Message): Promise<void> {
  mailer ??= import("nodemailer").then((mod) => {
    const nodemailer = ((mod as { default?: unknown }).default ?? mod) as { createTransport(url: string): Mailer };
    return nodemailer.createTransport(process.env.SMTP_URL as string);
  });
  await (await mailer).sendMail({
    from: emailSender(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    replyTo: message.replyTo,
  });
}

export async function getEmailHtml(id: string): Promise<string | null> {
  const { data, error } = await db().from("email_log").select("html").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { html: string } | null)?.html ?? null;
}
