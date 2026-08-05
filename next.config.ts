import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // vinext currently applies the Server Actions body ceiling while routing
    // multipart App Router requests. Audio uploads are streamed by our route,
    // but must first be allowed through this request gate.
    serverActions: {
      bodySizeLimit: "300mb",
    },
  },
};

export default nextConfig;
