import "server-only";

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

// Accepts both the current Supabase key names and the legacy anon/service_role
// names that the Vercel ↔ Supabase integration may still set.
export const env = {
  supabaseUrl: () =>
    required(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: () =>
    required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  supabaseSecretKey: () =>
    required(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SECRET_KEY"),
};
