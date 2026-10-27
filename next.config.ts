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
  experimental: {
    serverActions: {
      // Testing on a phone through a VS Code dev tunnel: the tunnel rewrites Origin to
      // localhost:3000 while X-Forwarded-Host carries the tunnel address. Development only.
      allowedOrigins: process.env.NODE_ENV === "production" ? [] : ["localhost:3000"],
    },
  },
};

export default nextConfig;
