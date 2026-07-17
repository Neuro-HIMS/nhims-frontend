import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_API_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Strict mode catches common React issues early
  reactStrictMode: true,

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*` }];
  },

  // Optimise images from the Java backend if it serves any
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
      },
    ],
  },

  // Expose only safe env vars to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "HMIS",
    /** Defaults to same-origin `/api/v1` (rewritten to BACKEND_API_ORIGIN). Browser axios base URL. */
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "/api/v1",
    NEXT_PUBLIC_ACCESS_COOKIE_NAME: process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME ?? "hmis_access",
    NEXT_PUBLIC_ENABLE_PLACEHOLDER_SPECIALTY_ROUTES:
      process.env.NEXT_PUBLIC_ENABLE_PLACEHOLDER_SPECIALTY_ROUTES ?? "false",
  },
};

export default nextConfig;
