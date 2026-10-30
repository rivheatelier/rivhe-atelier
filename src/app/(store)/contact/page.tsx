import type { Metadata } from "next";
import { IconChat, IconMail } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await getSettings();
  const channels = [
    settings.whatsapp && {
      icon: IconChat,
      label: "WhatsApp",
      value: settings.whatsapp,
      href: whatsappLink(settings.whatsapp, "Hi RIVHÉ Atelier!"),
    },
    settings.contactEmail && {
      icon: IconMail,
      label: "Email",
      value: settings.contactEmail,
      href: `mailto:${settings.contactEmail}`,
    },
  ].filter((c): c is Exclude<typeof c, "" | false> => Boolean(c));

  return (
    <div className="mx-auto max-w-xl px-5 pt-12 text-center sm:pt-16">
      <h1 className="font-serif text-[38px] leading-tight">Contact</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Questions about a piece, your order or shipping? We’d love to hear from you.
      </p>

      {channels.length > 0 ? (
        <ul className="mt-10 divide-y divide-line border-y border-line text-left">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center gap-4 py-5 transition-colors hover:text-ink"
              >
                <Icon className="h-6 w-6 text-ink-2" />
                <span className="flex-1">
                  <span className="eyebrow block text-muted">{label}</span>
                  <span className="mt-0.5 block text-[15px] text-ink">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-[14px] text-muted">Contact details are coming soon.</p>
      )}
    </div>
  );
}
