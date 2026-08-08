import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",       // Static HTML export
  trailingSlash: true,    // Required for static exports
  distDir: "out",         // Output to 'out' directory
  images: {
    unoptimized: true,    // Required for static export
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;

