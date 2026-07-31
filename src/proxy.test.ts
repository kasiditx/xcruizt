import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config } from "./proxy";

describe("Supabase session proxy matcher", () => {
  it.each(["/", "/auth/login", "/account/library", "/admin"])(
    "runs for application route %s",
    (url) => {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          nextConfig: {},
          url,
        }),
      ).toBe(true);
    },
  );

  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Fhero.webp",
    "/favicon.ico",
    "/product.webp",
  ])("skips static asset route %s", (url) => {
    expect(
        unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url,
      }),
    ).toBe(false);
  });
});
