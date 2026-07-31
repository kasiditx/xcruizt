import { describe, expect, it } from "vitest";

import {
  parseManualEntitlementGrant,
  parseManualEntitlementRevoke,
} from "./entitlement-input";

const firstId = "018f47a5-4e3e-7b6c-8e9f-0123456789ab";
const secondId = "018f47a5-4e3e-7b6c-8e9f-1123456789ab";

describe("manual entitlement input", () => {
  it("accepts an explicit grant and reason", () => {
    expect(
      parseManualEntitlementGrant({
        productId: firstId,
        reason: "Customer support replacement",
        userId: secondId,
      }).ok,
    ).toBe(true);
  });

  it("requires valid identifiers and a meaningful revoke reason", () => {
    expect(
      parseManualEntitlementRevoke({
        entitlementId: "bad",
        reason: "no",
      }).ok,
    ).toBe(false);
  });
});
