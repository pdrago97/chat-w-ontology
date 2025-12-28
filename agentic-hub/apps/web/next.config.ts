import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agentic-hub/database", "@agentic-hub/ui"],
};

export default nextConfig;

