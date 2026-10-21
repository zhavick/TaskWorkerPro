import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.117"],
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:5008/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
