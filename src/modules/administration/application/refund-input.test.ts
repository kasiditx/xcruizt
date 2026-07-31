import { describe, expect, it } from "vitest";

import { parseFullRefundInput } from "./refund-input";

const paymentId = "018f47a5-4e3e-7b6c-8e9f-0123456789ab";
const requestId = "018f47a5-4e3e-7b6c-8e9f-1123456789ab";

describe("parseFullRefundInput", () => {
  it("requires an idempotency key, payment, email and reason", () => {
    expect(
      parseFullRefundInput({
        instructionsEmail: "customer@example.com",
        paymentId,
        reason: "Customer requested a full refund",
        refundRequestId: requestId,
      }).ok,
    ).toBe(true);
  });

  it("rejects synthetic or malformed refund instructions", () => {
    expect(
      parseFullRefundInput({
        instructionsEmail: "customer@users.xcruizt.invalid",
        paymentId,
        reason: "short",
        refundRequestId: "bad",
      }).ok,
    ).toBe(false);
  });
});
