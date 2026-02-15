import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@shopify/shopify-api", "inngest"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.myshopify.com" },
    ],
  },
};

export default nextConfig;
