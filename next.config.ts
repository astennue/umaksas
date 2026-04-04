import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // TODO: Remove after fixing all TypeScript errors across the project
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
