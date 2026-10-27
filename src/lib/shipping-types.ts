// Shared by server and client components.

export type ShippingOption = {
  id: string;
  courier: string;
  service: string;
  eta: string;
  /** Rupiah */
  price: number;
};

/** A shipping option plus the signed token the server checks when the order is placed. */
export type SignedShippingOption = ShippingOption & { token: string };

export type ShippingSource = "biteship" | "estimate" | "international";

export type IntlZone = "asean" | "asiaPacific" | "world";
export type IntlCarrier = "dhl" | "aramex";

export const INTL_ZONES: { key: IntlZone; label: string }[] = [
  { key: "asean", label: "Southeast Asia" },
  { key: "asiaPacific", label: "Asia Pacific" },
  { key: "world", label: "Rest of world" },
];

/** International couriers, booked through Pos Indonesia. */
export const INTL_CARRIERS: Record<IntlCarrier, { name: string; eta: string }> = {
  dhl: { name: "DHL Express", eta: "3–7 business days" },
  aramex: { name: "Aramex", eta: "5–10 business days" },
};
