import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for pdf-parse native module resolution in serverless
  serverExternalPackages: ["pdf-parse"],

  // Allow browser access from the network host used by the dev server.
  allowedDevOrigins: ["192.168.56.1", "localhost"],

  // Enable streaming with extended timeout
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
