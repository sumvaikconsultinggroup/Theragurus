import type { NextConfig } from "next";

const compatibleDevelopment = process.env.THERAGURUS_CSS_COMPILER === "javascript";

const nextConfig: NextConfig = {
  distDir: compatibleDevelopment ? ".next-local" : ".next",
  images: {
    qualities: [75, 90],
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: [compatibleDevelopment ? "./scripts/tailwind-js-loader.cjs" : "@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
