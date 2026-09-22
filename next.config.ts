import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack doesn't pick up a
  // stray lockfile in a parent directory (e.g. ~/package-lock.json).
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
