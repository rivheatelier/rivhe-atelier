// Shared by the checkout form (instant feedback) and the server (authoritative check).

export type AddressInput = {
  email: string;
  name: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
};

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export const EMPTY_ADDRESS: AddressInput = {
  email: "",
  name: "",
  phone: "",
  country: "ID",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  notes: "",
};

const oneLine = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const multiLine = (value: unknown, max: number) =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, max);

export function normalizeAddress(raw: Partial<Record<keyof AddressInput, unknown>>): AddressInput {
  return {
    email: oneLine(raw.email, 160).toLowerCase(),
    name: oneLine(raw.name, 100),
    phone: oneLine(raw.phone, 24),
    country: oneLine(raw.country, 2).toUpperCase(),
    address: multiLine(raw.address, 400),
    city: oneLine(raw.city, 80),
    province: oneLine(raw.province, 80),
    postalCode: oneLine(raw.postalCode, 12).toUpperCase(),
    notes: multiLine(raw.notes, 500),
  };
}

export function validateAddress(a: AddressInput): AddressErrors {
  const errors: AddressErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) errors.email = "Enter a valid email address";
  if (a.name.length < 2) errors.name = "Enter your full name";
  if (!/^\+?[0-9 ()-]{6,20}$/.test(a.phone) || a.phone.replace(/\D/g, "").length < 6)
    errors.phone = "Enter a phone number we can reach you on";
  if (!/^[A-Z]{2}$/.test(a.country)) errors.country = "Choose a country";
  if (a.address.length < 6) errors.address = "Enter your street address";
  if (!a.city) errors.city = "Enter your city";
  if (!a.province) errors.province = a.country === "ID" ? "Enter your province" : "Enter your state or region";
  if (a.country === "ID" ? !/^\d{5}$/.test(a.postalCode) : !/^[A-Z0-9][A-Z0-9 -]{1,10}$/.test(a.postalCode))
    errors.postalCode = a.country === "ID" ? "Enter a 5-digit postal code" : "Enter your postal code";
  return errors;
}
