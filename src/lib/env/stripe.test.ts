import { describe, expect, it } from "vitest";

import { parseStripeEnvironment } from "./stripe";

describe("parseStripeEnvironment", () => {
  it("accepts Stripe test credentials", () => {
    expect(
      parseStripeEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
      }),
    ).toEqual({
      secretKey: "sk_test_example",
      webhookSecret: "whsec_example",
    });
  });

  it("rejects publishable keys and malformed webhook secrets", () => {
    expect(() =>
      parseStripeEnvironment({
        STRIPE_SECRET_KEY: "pk_test_example",
        STRIPE_WEBHOOK_SECRET: "secret",
      }),
    ).toThrow();
  });
});
