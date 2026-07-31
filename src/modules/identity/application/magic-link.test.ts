import { describe, expect, it } from "vitest";

import {
  buildAuthCallbackUrl,
  parseMagicLinkEmail,
} from "./magic-link";

describe("parseMagicLinkEmail", () => {
  it("normalizes a valid email address", () => {
    expect(parseMagicLinkEmail("  Customer@Example.COM ")).toBe(
      "customer@example.com",
    );
  });

  it.each(["", "customer", "customer@", "@example.com"])(
    "rejects invalid email %s",
    (email) => {
      expect(() => parseMagicLinkEmail(email)).toThrow();
    },
  );
});

describe("buildAuthCallbackUrl", () => {
  it("builds an encoded callback URL on the configured site origin", () => {
    expect(
      buildAuthCallbackUrl(
        "https://xcruizt.example",
        "/account/orders?status=paid",
      ),
    ).toBe(
      "https://xcruizt.example/auth/callback?next=%2Faccount%2Forders%3Fstatus%3Dpaid",
    );
  });
});
