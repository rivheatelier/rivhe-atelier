import { createCaptchaChallenge } from "@/lib/captcha";

// A fresh challenge each time a captcha starts solving: on "Track your order", and behind
// WhatsApp on Contact.
export async function GET() {
  return Response.json(await createCaptchaChallenge(), { headers: { "Cache-Control": "no-store" } });
}
