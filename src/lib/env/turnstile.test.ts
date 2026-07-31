import { describe, expect, it } from "vitest";

import { parseTurnstileEnvironment } from "./turnstile";

describe("Turnstile environment", () => {
  it("requires a complete public/private key pair", () => {
    expect(
      parseTurnstileEnvironment({
        NEXT_PUBLIC_TURNSTILE_SITE_KEY:
          "1x00000000000000000000AA",
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      }),
    ).toEqual({
      secretKey: "1x0000000000000000000000000000000AA",
      siteKey: "1x00000000000000000000AA",
    });
  });

  it("rejects partial or undersized credentials", () => {
    expect(() =>
      parseTurnstileEnvironment({
        NEXT_PUBLIC_TURNSTILE_SITE_KEY:
          "1x00000000000000000000AA",
      }),
    ).toThrow();
    expect(() =>
      parseTurnstileEnvironment({
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "short",
        TURNSTILE_SECRET_KEY: "short",
      }),
    ).toThrow();
  });
});
