import { describe, expect, it } from "vitest";

import {
  createRateLimitIdentifier,
  evaluateLocalRateLimit,
} from "./rate-limit-policy";

describe("security rate limits", () => {
  it("hashes identifiers without leaking their raw values", () => {
    const identifier = createRateLimitIdentifier(
      "auth_signin",
      ["203.0.113.7", "Example_User"],
      "a-secret-used-only-for-the-test",
    );

    expect(identifier).toMatch(/^[a-f0-9]{64}$/);
    expect(identifier).not.toContain("203.0.113.7");
    expect(identifier).not.toContain("example_user");
    expect(identifier).toBe(
      createRateLimitIdentifier(
        "auth_signin",
        ["203.0.113.7", "example_user"],
        "a-secret-used-only-for-the-test",
      ),
    );
  });

  it("blocks requests at the limit and returns a bounded retry time", () => {
    const policy = { limit: 2, window: "1 m" as const, windowMs: 60_000 };
    const result = evaluateLocalRateLimit([1_000, 2_000], policy, 10_000);

    expect(result).toMatchObject({
      allowed: false,
      limit: 2,
      remaining: 0,
      retryAfterSeconds: 51,
      timestamps: [1_000, 2_000],
    });
  });

  it("drops expired local attempts before making a decision", () => {
    const policy = { limit: 2, window: "1 m" as const, windowMs: 60_000 };
    const result = evaluateLocalRateLimit([1_000, 70_000], policy, 80_000);

    expect(result).toMatchObject({
      allowed: true,
      remaining: 0,
      timestamps: [70_000, 80_000],
    });
  });
});
