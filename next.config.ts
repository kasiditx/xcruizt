import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import { getSecurityHeaders } from "./src/lib/security/headers";

function mediaRemotePatterns() {
  const candidate = process.env.NEXT_PUBLIC_MEDIA_ORIGIN;
  if (!candidate) return [];

  try {
    const origin = new URL(candidate);
    if (origin.protocol !== "https:") return [];
    return [
      {
        hostname: origin.hostname,
        pathname: "/**",
        port: origin.port,
        protocol: "https" as const,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        headers: getSecurityHeaders(process.env.APP_ENV === "production"),
        source: "/:path*",
      },
    ];
  },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaRemotePatterns(),
  },
  reactStrictMode: true,
};

const sentrySourceMapUploadConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    disable: !sentrySourceMapUploadConfigured,
  },
  telemetry: false,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
