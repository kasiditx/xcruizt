import { describe, expect, it } from "vitest";

import { parseCouponInput } from "./coupon-input";

const baseInput = {
  code: "launch_20",
  discountType: "percent",
  discountValue: "20",
  endsAt: "2026-09-01T00:00",
  maximumDiscount: "500.50",
  minimumAmount: "1000",
  perUserLimit: "1",
  startsAt: "2026-08-01T00:00",
  usageLimit: "100",
};

describe("parseCouponInput", () => {
  it("normalizes a percentage coupon and Bangkok timestamps", () => {
    expect(parseCouponInput(baseInput)).toEqual({
      ok: true,
      value: {
        code: "LAUNCH_20",
        discountType: "percent",
        discountValue: 20,
        endsAt: new Date("2026-08-31T17:00:00.000Z"),
        maximumDiscountSatang: 50_050,
        minimumAmountSatang: 100_000,
        perUserLimit: 1,
        startsAt: new Date("2026-07-31T17:00:00.000Z"),
        usageLimit: 100,
      },
    });
  });

  it("converts fixed THB discount to satang", () => {
    const parsed = parseCouponInput({
      ...baseInput,
      discountType: "fixed",
      discountValue: "299.99",
      maximumDiscount: "",
      minimumAmount: "",
      perUserLimit: "",
      usageLimit: "",
    });

    expect(parsed).toMatchObject({
      ok: true,
      value: {
        discountValue: 29_999,
        maximumDiscountSatang: null,
        minimumAmountSatang: null,
      },
    });
  });

  it.each([
    { ...baseInput, code: "bad code" },
    { ...baseInput, discountValue: "101" },
    { ...baseInput, endsAt: baseInput.startsAt },
    { ...baseInput, perUserLimit: "101" },
    { ...baseInput, minimumAmount: "-1" },
  ])("rejects unsafe coupon input", (input) => {
    expect(parseCouponInput(input)).toEqual({ ok: false });
  });
});
