import "server-only";
import { createChallenge, randomInt, verifySolution } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import type { Challenge, Payload } from "altcha-lib/types";
import { deriveSecret } from "@/lib/sign";
import { db } from "@/lib/supabase/admin";

// ALTCHA proof of work. The browser derives PBKDF2 keys until it reaches the counter the
// server picked: about a second on a laptop, a few on a phone, done while the buyer
// types, and every scripted guess at an order number costs the same work again.
const ALGORITHM = "PBKDF2/SHA-256";
const COST = 1_000;
const COUNTER = { min: 1_500, max: 3_000 };
const LIFETIME_MS = 10 * 60 * 1000;

const secrets = () => ({
  hmacSignatureSecret: deriveSecret("captcha-challenge"),
  hmacKeySignatureSecret: deriveSecret("captcha-key"),
});

export function createCaptchaChallenge(): Promise<Challenge> {
  return createChallenge({
    algorithm: ALGORITHM,
    cost: COST,
    counter: randomInt(COUNTER.max, COUNTER.min),
    deriveKey,
    expiresAt: new Date(Date.now() + LIFETIME_MS),
    ...secrets(),
  });
}

/** True for a valid, unexpired solution the first time it is sent; the same solution again is refused. */
export async function verifyCaptcha(value: string): Promise<boolean> {
  const payload = parsePayload(value);
  if (!payload) return false;
  const { verified } = await verifySolution({ challenge: payload.challenge, solution: payload.solution, deriveKey, ...secrets() });
  const { nonce, expiresAt } = payload.challenge.parameters;
  if (!verified || !expiresAt) return false;

  const { data, error } = await db().rpc("use_captcha", { p_id: nonce, p_expires_at: new Date(expiresAt * 1000).toISOString() });
  if (error) throw new Error(error.message);
  return data === true;
}

/** The widget sends `{ challenge, solution }` as base64 JSON in the `altcha` form field. */
function parsePayload(value: string): Payload | null {
  if (!value || value.length > 4000) return null;
  try {
    const payload = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as Payload;
    return payload?.challenge?.parameters && payload.solution ? payload : null;
  } catch {
    return null;
  }
}
