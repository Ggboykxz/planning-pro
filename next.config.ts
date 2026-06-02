import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space.chatglm.site",
    "space.chatglm.site",
    ".space-z.ai",
    "space-z.ai",
    "localhost",
    "localhost:3000",
  ],
};

export default nextConfig;
