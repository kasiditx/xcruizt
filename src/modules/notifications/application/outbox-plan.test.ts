import { describe, expect, it } from "vitest";

import {
  createOutboxDeliveryPlan,
  getOutboxRetryDelayMs,
} from "./outbox-plan";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const PRODUCT_ID = "00000000-0000-4000-8000-000000000002";
const VERSION_ID = "00000000-0000-4000-8000-000000000003";

describe("createOutboxDeliveryPlan", () => {
  it("isolates paid-order email and Discord side effects", () => {
    expect(
      createOutboxDeliveryPlan("order.paid", {
        orderId: VERSION_ID,
        orderNumber: "XRZT-001",
        userId: USER_ID,
      }),
    ).toMatchObject({
      emailKind: "order_paid",
      enqueueDiscordSync: true,
      kind: "customer",
      userId: USER_ID,
    });
  });

  it("fans a published version out through child outbox events", () => {
    expect(
      createOutboxDeliveryPlan("product.version.published", {
        productId: PRODUCT_ID,
        productVersionId: VERSION_ID,
        version: "1.2.0",
      }),
    ).toEqual({
      kind: "fanout_product_version",
      productId: PRODUCT_ID,
      productVersionId: VERSION_ID,
      version: "1.2.0",
    });
  });

  it("does not notify for a non-final refund status", () => {
    expect(
      createOutboxDeliveryPlan("refund.status_changed", {
        status: "pending",
        userId: USER_ID,
      }),
    ).toEqual({ kind: "no_delivery" });
  });

  it.each([
    ["unknown.topic", {}],
    ["order.paid", { userId: "not-a-uuid" }],
    ["product.version.published", { productId: PRODUCT_ID }],
  ])("rejects unsupported or malformed event %s", (topic, payload) => {
    expect(createOutboxDeliveryPlan(topic, payload)).toBeNull();
  });
});

describe("getOutboxRetryDelayMs", () => {
  it("caps retry delay at 30 minutes", () => {
    expect([1, 2, 3, 4, 8, 20].map(getOutboxRetryDelayMs)).toEqual([
      15_000,
      30_000,
      60_000,
      120_000,
      1_800_000,
      1_800_000,
    ]);
  });
});
