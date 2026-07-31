import { describe, expect, it } from "vitest";

import {
  evaluateTurnstileResponse,
  turnstileTokenSchema,
} from "./turnstile-policy";

describe("Turnstile policy", () => {
  it("requires success, action and hostname to match", () => {
    expect(
      evaluateTurnstileResponse(
        { action: "signin", hostname: "xcruizt.example", success: true },
        { action: "signin", hostname: "xcruizt.example" },
      ),
    ).toBe(true);
    expect(
      evaluateTurnstileResponse(
        { action: "signup", hostname: "xcruizt.example", success: true },
        { action: "signin", hostname: "xcruizt.example" },
      ),
    ).toBe(false);
    expect(
      evaluateTurnstileResponse(
        { action: "signin", hostname: "evil.example", success: true },
        { action: "signin", hostname: "xcruizt.example" },
      ),
    ).toBe(false);
  });

  it("bounds token input", () => {
    expect(turnstileTokenSchema.safeParse("token").success).toBe(true);
    expect(turnstileTokenSchema.safeParse("").success).toBe(false);
    expect(turnstileTokenSchema.safeParse("x".repeat(2_049)).success).toBe(false);
  });
});
