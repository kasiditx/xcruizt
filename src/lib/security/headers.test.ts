import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "./headers";

describe("getSecurityHeaders", () => {
  it("ships defense-in-depth headers and a report-only CSP", () => {
    const headers = new Map(
      getSecurityHeaders(false).map(({ key, value }) => [key, value]),
    );

    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "object-src 'none'",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).not.toContain(
      "unsafe-eval",
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://challenges.cloudflare.com",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.has("Strict-Transport-Security")).toBe(false);
  });

  it("enables HSTS only for production", () => {
    const headers = new Map(
      getSecurityHeaders(true).map(({ key, value }) => [key, value]),
    );

    expect(headers.get("Strict-Transport-Security")).toContain(
      "max-age=31536000",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "object-src 'none'",
    );
    expect(headers.has("Content-Security-Policy-Report-Only")).toBe(false);
  });
});
