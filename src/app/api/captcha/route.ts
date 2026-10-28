import { createCaptchaChallenge } from "@/lib/captcha";

// A fresh challenge each time the captcha on "Track your order" starts solving.
export async function GET() {
  return Response.json(await createCaptchaChallenge(), { headers: { "Cache-Control": "no-store" } });
}
