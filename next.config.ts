import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.optimization.minimize = false;
    return config;
  },
  experimental: {
    serverMinification: false,
  },
};

export default nextConfig;
