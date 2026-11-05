import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:5010";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.0.117"],
  async redirects() {
    return [
      {
        source: "/tugas",
        destination: "/tasks",
        permanent: false,
      },
      {
        source: "/tugas/kanban",
        destination: "/tasks/kanban",
        permanent: false,
      },
      {
        source: "/kanban",
        destination: "/tasks/kanban",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/hubs/:path*",
        destination: `${backendUrl}/hubs/:path*`,
      },
      {
        source: "/swagger/:path*",
        destination: `${backendUrl}/swagger/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
