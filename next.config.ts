import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // No detengas el build aunque haya errores de TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
