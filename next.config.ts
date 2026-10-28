import path from "node:path";
import type { NextConfig } from "next";

// Product photos live in Supabase Storage. Hosted projects are covered by the
// *.supabase.co pattern; a local `supabase start` stack is added from the env.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabase = supabaseUrl ? new URL(supabaseUrl) : null;
const isLocalSupabase = !!supabase && ["localhost", "127.0.0.1"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 85],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(isLocalSupabase && supabase
        ? [
            {
              protocol: supabase.protocol === "https:" ? ("https" as const) : ("http" as const),
              hostname: supabase.hostname,
              port: supabase.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  serverExternalPackages: ["nodemailer"],
  turbopack: { root: path.resolve(__dirname) },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No other site may frame these pages (clickjacking), and no plugins or foreign form targets.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Order links carry a secret token: other sites only ever see our origin.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      {
        // Stored emails shown in the admin: no scripts or forms, sandboxed. Listed last so this
        // replaces the policy above (headers set by the route handler itself would be overridden).
        source: "/admin/emails/:id",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; frame-ancestors 'none'; sandbox",
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // Testing on a phone through a VS Code dev tunnel: the tunnel rewrites Origin to
      // localhost:3000 while X-Forwarded-Host carries the tunnel address. Development only.
      allowedOrigins: process.env.NODE_ENV === "production" ? [] : ["localhost:3000"],
    },
  },
};

export default nextConfig;
