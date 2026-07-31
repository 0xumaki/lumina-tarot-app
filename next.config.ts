import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  typescript: {
    // Pre-existing TS errors in examples/ and skills/ folders — not in app code
    ignoreBuildErrors: true,
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
    minimumCacheTTL: 86400, // 1 day
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
