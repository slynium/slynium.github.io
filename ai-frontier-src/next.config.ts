import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  output: "export",        // static export for GitHub Pages
  trailingSlash: true,     // required for GitHub Pages routing
  images: { unoptimized: true },
};

export default nextConfig;
