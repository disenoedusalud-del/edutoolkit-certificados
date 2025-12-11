import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // No detengas el build aunque haya errores de TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Tampoco detengas el build por errores de ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
