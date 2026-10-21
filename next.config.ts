import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Agent rules live in CLAUDE.md; don't let `next dev` write AGENTS.md.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Photos are uploaded through a Server Action, one per request, already
    // resized to at most 3 MiB (ADR 0009). Next's default is 1 MB; Vercel
    // rejects anything above 4.5 MB whatever this says.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
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
