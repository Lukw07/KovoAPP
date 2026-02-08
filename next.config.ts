import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        // Allow images served from our own upload API
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.kovo.cz",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
