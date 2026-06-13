import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isStaticExport = basePath.length > 0;

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  basePath,
  images: {
    unoptimized: isStaticExport,
  },
};

export default nextConfig;
