import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['img.clerk.com'],
  },
  webpack: (config) => {
    config.externals = [...config.externals, { canvas: 'canvas' }];
    return config;
  },
};

export default nextConfig;
