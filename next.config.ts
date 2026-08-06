import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable SWC minification to work around a known SWC bug where
  // `return NaN` (with space) gets mangled to `returnNaN` (no space),
  // causing ReferenceError: returnNaN is not defined at runtime.
  webpack: (config) => {
    config.optimization.minimize = false;
    return config;
  },
};

export default nextConfig;
