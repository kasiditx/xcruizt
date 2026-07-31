import { describe, expect, it } from "vitest";

import { parseAnalyticsEvent } from "./events";

describe("parseAnalyticsEvent", () => {
  it("accepts an allowlisted storefront event", () => {
    expect(
      parseAnalyticsEvent({
        name: "product_viewed",
        properties: {
          collectionId: "77d54000-8b31-4a94-a259-5153155f2702",
          productId: "7d09c13a-d614-4764-a0f1-47b46848b064",
        },
      }),
    ).toEqual({
      name: "product_viewed",
      properties: {
        collectionId: "77d54000-8b31-4a94-a259-5153155f2702",
        productId: "7d09c13a-d614-4764-a0f1-47b46848b064",
      },
    });
  });

  it("rejects PII and unapproved properties", () => {
    expect(() =>
      parseAnalyticsEvent({
        name: "checkout_started",
        properties: {
          email: "customer@example.com",
          itemCount: 1,
          totalBucket: "500_999",
        },
      }),
    ).toThrow();
  });

  it("rejects unknown event names", () => {
    expect(() =>
      parseAnalyticsEvent({
        name: "customer_email_captured",
        properties: {},
      }),
    ).toThrow();
  });
});
