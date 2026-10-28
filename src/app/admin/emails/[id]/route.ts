import { getAdminUser } from "@/lib/auth";
import { getEmailHtml } from "@/lib/email";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shows an email exactly as it was sent (or would have been, without a provider). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const html = UUID.test(id) ? await getEmailHtml(id) : null;
  if (!html) return new Response("Not found", { status: 404 });
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Buyer-supplied text is escaped in every template; the sandbox is a second wall.
      // next.config.ts sends the same policy for this path, which takes precedence.
      "content-security-policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox",
      "cache-control": "private, no-store",
    },
  });
}
