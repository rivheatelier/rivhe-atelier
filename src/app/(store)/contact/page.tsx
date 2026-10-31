import type { Metadata } from "next";
import { IconMail } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { WhatsappChat } from "./whatsapp-chat";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const { whatsapp, contactEmail } = await getSettings();

  return (
    <div className="mx-auto max-w-xl px-5 pt-12 text-center sm:pt-16">
      <h1 className="font-serif text-[38px] leading-tight">Contact</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Questions about a piece, your order or shipping? We’d love to hear from you.
      </p>

      {whatsapp || contactEmail ? (
        <ul className="mt-10 divide-y divide-line border-y border-line text-left">
          {/* A button, not a wa.me link: the number stays out of the page, away from scrapers. */}
          {whatsapp && (
            <li>
              <WhatsappChat />
            </li>
          )}
          {contactEmail && (
            <li>
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-4 py-5 transition-colors hover:text-ink">
                <IconMail className="h-6 w-6 text-ink-2" />
                <span className="flex-1">
                  <span className="eyebrow block text-muted">Email</span>
                  <span className="mt-0.5 block text-[15px] text-ink">{contactEmail}</span>
                </span>
              </a>
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-10 text-[14px] text-muted">Contact details are coming soon.</p>
      )}
    </div>
  );
}
