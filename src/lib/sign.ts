import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  const base = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Set APP_SECRET or SUPABASE_SECRET_KEY");
  return createHash("sha256").update(`rivhe-sign:${base}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Tamper-proof token for data the browser carries between steps (e.g. a shipping quote). */
export function sign(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verify<T>(token: string): T | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  if (!safeEqual(mac, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 16);
}
