import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Agent rules live in CLAUDE.md; don't let `next dev` write AGENTS.md.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Points next-intl at src/i18n/request.ts (its default location).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
