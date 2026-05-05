import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode catches common React issues early
  reactStrictMode: true,

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
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1",
  },
};

export default nextConfig;