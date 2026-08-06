import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep large audio Server Actions aligned with the multipart Route Handlers.
    serverActions: {
      bodySizeLimit: "300mb",
    },
  },
};

export default nextConfig;
