import type { Metadata } from "next";
import Link from "next/link";
import {
  changePasswordAction,
  refreshRatesAction,
  saveSettingsAction,
  sendTestEmailAction,
} from "@/app/admin/actions";
import { ActionButton, ActionForm, Field } from "@/components/admin/action-form";
import { ImageManager } from "@/components/admin/image-manager";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatIDR, transferAmountFor } from "@/lib/currency";
import { emailProvider, emailSender } from "@/lib/email";
import { getUsdRate } from "@/lib/exchange-rate";
import { getTheme } from "@/lib/theme-server";
import { ThemeSwitch } from "@/components/theme-switch";
import { getSettings } from "@/lib/settings";
import { INTL_CARRIERS, INTL_ZONES, type IntlCarrier } from "@/lib/shipping-types";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  ["store", "Store"],
  ["hero", "Homepage"],
  ["bank", "Bank transfer"],
  ["rate", "Exchange rate"],
  ["shipping", "Shipping"],
  ["product", "Product text"],
  ["email", "Email"],
  ["appearance", "Appearance"],
  ["account", "Account"],
];

export default async function AdminSettingsPage() {
  const [admin, settings, rate, theme] = await Promise.all([requireAdmin(), getSettings(), getUsdRate(), getTheme()]);
  const provider = emailProvider();
  const example = 1160000;

  return (
    <>
      <PageTitle title="Settings" />
      <nav className="no-scrollbar sticky top-14 z-20 -mx-4 mb-5 flex gap-2 overflow-x-auto bg-canvas/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 lg:top-0" aria-label="Sections">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] text-ink-2 hover:border-ink/40">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        <Card id="store" title="Store & contact">
          <ActionForm action={saveSettingsAction}>
            <input type="hidden" name="section" value="store" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Store name" htmlFor="s-storeName">
                <input id="s-storeName" name="storeName" defaultValue={settings.storeName} className="field" />
              </Field>
              <Field label="Tagline" htmlFor="s-tagline" hint="Shown on the homepage and in the footer.">
                <input id="s-tagline" name="tagline" defaultValue={settings.tagline} className="field" />
              </Field>
              <Field label="Homepage subtitle" htmlFor="s-heroSubtitle" className="sm:col-span-2">
                <input id="s-heroSubtitle" name="heroSubtitle" defaultValue={settings.heroSubtitle} className="field" />
              </Field>
              <Field label="Order notifications go to" htmlFor="s-sellerEmail" hint="New orders and payment receipts for you.">
                <input id="s-sellerEmail" name="sellerEmail" type="email" defaultValue={settings.sellerEmail} placeholder={admin.email} className="field" />
              </Field>
              <Field label="Contact email for buyers" htmlFor="s-contactEmail" hint="Also used as the reply-to address.">
                <input id="s-contactEmail" name="contactEmail" type="email" defaultValue={settings.contactEmail} className="field" />
              </Field>
              <Field label="WhatsApp number" htmlFor="s-whatsapp">
                <input id="s-whatsapp" name="whatsapp" defaultValue={settings.whatsapp} placeholder="0812 3456 7890" className="field" />
              </Field>
              <Field label="Instagram username" htmlFor="s-instagram">
                <input id="s-instagram" name="instagram" defaultValue={settings.instagram} placeholder="rivhe.atelier" className="field" />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card id="hero" title="Homepage photos">
          <ActionForm action={saveSettingsAction} submitLabel="Save photos">
            <input type="hidden" name="section" value="hero" />
            <ImageManager name="heroImages" initial={settings.heroImages} folder="site" max={5} />
            <p className="mt-3 text-[12px] text-muted">Up to 5 photos rotate at the top of the homepage, in this order.</p>
          </ActionForm>
        </Card>

        <Card id="bank" title="Bank transfer">
          <ActionForm action={saveSettingsAction}>
            <input type="hidden" name="section" value="bank" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Bank" htmlFor="s-bankName">
                <input id="s-bankName" name="bankName" defaultValue={settings.bankName} className="field" />
              </Field>
              <Field label="Account number" htmlFor="s-bankAccountNumber">
                <input id="s-bankAccountNumber" name="bankAccountNumber" defaultValue={settings.bankAccountNumber} inputMode="numeric" className="field" />
              </Field>
              <Field label="Account holder" htmlFor="s-bankAccountName">
                <input id="s-bankAccountName" name="bankAccountName" defaultValue={settings.bankAccountName} className="field" />
              </Field>
              <Field label="SWIFT code" htmlFor="s-bankSwift" hint="For buyers paying from abroad. Shown only on orders shipping outside Indonesia.">
                <input
                  id="s-bankSwift"
                  name="bankSwift"
                  defaultValue={settings.bankSwift}
                  placeholder="BMRIIDJA"
                  autoCapitalize="characters"
                  className="field"
                />
              </Field>
              <Field
                label="Unique ending"
                htmlFor="s-paymentSuffix"
                hint={`The last 2 digits of every transfer are replaced with this, e.g. ${formatIDR(example)} → ${formatIDR(transferAmountFor(example, settings.paymentSuffix))}.`}
              >
                <input
                  id="s-paymentSuffix"
                  name="paymentSuffix"
                  defaultValue={String(settings.paymentSuffix).padStart(2, "0")}
                  inputMode="numeric"
                  maxLength={2}
                  className="field"
                />
              </Field>
              <Field label="Payment window (hours)" htmlFor="s-reservationHours" hint="Unpaid orders are cancelled after this and their pieces go back on sale.">
                <input id="s-reservationHours" name="reservationHours" type="number" min={1} max={168} defaultValue={settings.reservationHours} className="field" />
              </Field>
            </div>
          </ActionForm>
          <p className="mt-5 border-t border-line pt-4 text-[12px] leading-relaxed text-muted">
            {process.env.MOOTA_WEBHOOK_SECRET
              ? "Automatic matching is on: transfers reported by Moota that match exactly one waiting order confirm it and send the receipts."
              : "Confirm each payment from its order page once the transfer shows in your bank app. Automatic matching via Moota can be added later (see README)."}
          </p>
        </Card>

        <Card id="rate" title="Exchange rate">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Prices are set in US dollars. Visitors can switch to IDR, and every order is charged in Rupiah at the live rate, rounded to the
            nearest thousand per piece.
          </p>
          <div className="mt-4 flex items-baseline justify-between gap-4 rounded-[3px] bg-cream/70 px-4 py-3">
            <p className="font-serif text-[26px] leading-none text-ink">
              1 US$ = {formatIDR(Math.round(rate.rate))}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${rate.live ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}
            >
              {rate.live ? "live" : "last known"}
            </span>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            {rate.source}
            {rate.updatedAt && ` · ${formatDateTime(rate.updatedAt)}`} · refreshes on its own every 10 minutes
          </p>
          <div className="mt-4">
            <ActionButton action={refreshRatesAction} label="Refresh now" />
          </div>
        </Card>

        <Card id="shipping" title="Shipping">
          <p className="mb-4 rounded-[3px] bg-cream/70 px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
            {process.env.BITESHIP_API_KEY
              ? "Live courier rates from Biteship are on for addresses in Indonesia."
              : "Indonesian rates are estimated from the postal code. Add BITESHIP_API_KEY for live JNE, SiCepat and other courier rates."}
          </p>
          <ActionForm action={saveSettingsAction}>
            <input type="hidden" name="section" value="shipping" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ship from — postal code" htmlFor="s-originPostalCode">
                <input id="s-originPostalCode" name="originPostalCode" defaultValue={settings.originPostalCode} inputMode="numeric" maxLength={5} className="field" />
              </Field>
              <Field label="Ship from — city" htmlFor="s-originCity">
                <input id="s-originCity" name="originCity" defaultValue={settings.originCity} className="field" />
              </Field>
              <Field label="Couriers (Biteship codes)" htmlFor="s-couriers" hint="Comma-separated, e.g. jne,sicepat,anteraja,jnt" className="sm:col-span-2">
                <input id="s-couriers" name="couriers" defaultValue={settings.couriers} className="field" />
              </Field>
            </div>
            <label className="mt-5 flex items-start gap-3 text-[13px] text-ink-2">
              <input type="checkbox" name="internationalShipping" defaultChecked={settings.internationalShipping} className="mt-0.5 h-4 w-4 accent-ink" />
              Ship internationally with DHL Express and Aramex, booked through Pos Indonesia
            </label>
            <table className="mt-4 w-full text-[13px]">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 font-normal text-muted">Rupiah per kg</th>
                  {(Object.keys(INTL_CARRIERS) as IntlCarrier[]).map((carrier) => (
                    <th key={carrier} className="pb-2 pl-2 font-normal">
                      <label className="flex items-center gap-2 text-ink">
                        <input
                          type="checkbox"
                          name={`carrier_${carrier}`}
                          defaultChecked={settings.intlCarriers[carrier].enabled}
                          className="h-4 w-4 accent-ink"
                        />
                        {INTL_CARRIERS[carrier].name}
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INTL_ZONES.map((zone) => (
                  <tr key={zone.key}>
                    <td className="py-1 pr-2 text-ink-2">{zone.label}</td>
                    {(Object.keys(INTL_CARRIERS) as IntlCarrier[]).map((carrier) => (
                      <td key={carrier} className="py-1 pl-2">
                        <input
                          name={`intl_${carrier}_${zone.key}`}
                          defaultValue={settings.intlCarriers[carrier].ratePerKg[zone.key]}
                          inputMode="numeric"
                          aria-label={`${INTL_CARRIERS[carrier].name}, ${zone.label}, rupiah per kg`}
                          className="field h-9 text-right"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-muted">
              Buyers abroad choose between the couriers you switch on. Delivery estimates shown: DHL {INTL_CARRIERS.dhl.eta}, Aramex{" "}
              {INTL_CARRIERS.aramex.eta}.
            </p>
          </ActionForm>
        </Card>

        <Card id="product" title="Product page text">
          <ActionForm action={saveSettingsAction}>
            <input type="hidden" name="section" value="product" />
            <div className="space-y-4">
              <Field label="Shipping (shown on every product)" htmlFor="s-shippingNote">
                <textarea id="s-shippingNote" name="shippingNote" rows={3} defaultValue={settings.shippingNote} className="field" />
              </Field>
              <Field label="Care (shown on every product)" htmlFor="s-careNote">
                <textarea id="s-careNote" name="careNote" rows={3} defaultValue={settings.careNote} className="field" />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <Card id="email" title="Email">
          <p className="text-[13px] leading-relaxed text-ink-2">
            {provider === "resend"
              ? "Sending with Resend."
              : provider === "smtp"
                ? "Sending over SMTP."
                : "Not connected. Order emails are saved on each order but not sent — add RESEND_API_KEY or SMTP_URL in Vercel."}
          </p>
          <p className="mt-1 text-[12px] text-muted">From: {emailSender()}</p>
          <div className="mt-4">
            <ActionButton action={sendTestEmailAction} label="Send a test email" />
          </div>
        </Card>

        <Card id="appearance" title="Appearance">
          <p className="mb-4 text-[13px] leading-relaxed text-ink-2">
            Light or dark mode for this device, here and on the store. Auto follows the phone or computer setting.
          </p>
          <ThemeSwitch initial={theme} labels />
        </Card>

        <Card id="account" title="Account">
          <p className="mb-4 text-[13px] text-ink-2">
            Signed in as <span className="text-ink">{admin.email}</span>
          </p>
          <ActionForm action={changePasswordAction} submitLabel="Change password">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="New password" htmlFor="s-password">
                <input id="s-password" name="password" type="password" autoComplete="new-password" minLength={8} className="field" />
              </Field>
              <Field label="Repeat new password" htmlFor="s-confirm">
                <input id="s-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} className="field" />
              </Field>
            </div>
          </ActionForm>
          <p className="mt-4 text-[12px] text-muted">
            Add more admins in Supabase → Authentication and in the ADMIN_EMAILS variable. <Link href="/admin" className="underline underline-offset-4">Back to overview</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
