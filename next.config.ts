import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Supabase Storage signed URLs + provider CDN hosts are resolved at runtime,
    // so remote patterns are derived from env rather than hard-coded.
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            },
          ]
        : []),
      { protocol: "https" as const, hostname: "replicate.delivery" },
      { protocol: "https" as const, hostname: "*.replicate.delivery" },
    ],
  },
};

export default nextConfig;
