import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright", "playwright-core", "sharp", "exceljs"],
  // Playwright loads files dynamically that output-file tracing cannot see; ship the whole package.
  outputFileTracingIncludes: {
    "/api/packs/[id]/export/[format]": ["./node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/**/*", "./node_modules/.pnpm/playwright@*/node_modules/playwright/**/*"],
  },
  experimental: {
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
