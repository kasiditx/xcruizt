import { describe, expect, it } from "vitest";

import {
  extractClientIp,
  hashSensitiveValue,
} from "./client-fingerprint";

describe("extractClientIp", () => {
  it("prefers Cloudflare's connecting IP", () => {
    expect(
      extractClientIp(
        new Headers({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "198.51.100.1",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("uses the first valid forwarded address", () => {
    expect(
      extractClientIp(
        new Headers({
          "x-forwarded-for": "198.51.100.1, 10.0.0.1",
        }),
      ),
    ).toBe("198.51.100.1");
  });

  it("rejects malformed addresses", () => {
    expect(
      extractClientIp(
        new Headers({ "x-forwarded-for": "not-an-ip" }),
      ),
    ).toBeNull();
  });
});

describe("hashSensitiveValue", () => {
  it("returns a stable keyed digest without exposing the input", () => {
    const digest = hashSensitiveValue(
      "203.0.113.7",
      "s".repeat(32),
    );

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(
      hashSensitiveValue("203.0.113.7", "s".repeat(32)),
    );
    expect(digest).not.toContain("203.0.113.7");
  });
});
