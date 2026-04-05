import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // TODO: Remove after fixing all TypeScript errors across the project
  typescript: {
    ignoreBuildErrors: true,
  },
  // Increase server body size limit for file uploads (QR codes, images, documents)
  // Default is ~1MB which is too small for base64-encoded images
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
