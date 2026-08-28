import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build (server + only the
  // node_modules it actually needs) — the Dockerfile's runtime stage copies
  // just that output, not the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
