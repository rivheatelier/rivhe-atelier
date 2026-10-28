/** Logos for the bank in Settings, matched on its name. Other banks get a generic icon. */
const LOGOS = [{ match: /mandiri/i, src: "/banks/mandiri.png", width: 500, height: 146 }];

export function bankLogo(bankName: string) {
  return LOGOS.find((logo) => logo.match.test(bankName)) ?? null;
}

/** Instructions shown with the SWIFT code to buyers paying from abroad. */
export const SWIFT_NOTE =
  "Paying from abroad? Send an international (SWIFT) transfer in Indonesian Rupiah and choose “OUR” for the bank charges, so the full amount reaches us.";
