import { describe, expect, it } from "vitest";

import {
  calculatePriceQuote,
  parseCheckoutRequest,
  type PricingContext,
} from "./pricing";

const skuA = {
  currency: "THB" as const,
  id: "11111111-1111-4111-8111-111111111111",
  name: "Monday Mellow",
  priceSatang: 4900,
  productIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
  purchaseLimit: 2,
  skuCode: "XRZT-MONDAY",
  status: "active" as const,
};

const baseContext: PricingContext = {
  coupon: null,
  now: new Date("2026-07-31T10:00:00.000Z"),
  ownedProductIds: new Set(),
  requestedItems: [{ quantity: 1, skuId: skuA.id }],
  skus: [skuA],
};

describe("parseCheckoutRequest", () => {
  it("deduplicates SKU lines and sums quantities", () => {
    expect(
      parseCheckoutRequest({
        couponCode: " opening ",
        items: [
          { quantity: 1, skuId: skuA.id },
          { quantity: 1, skuId: skuA.id },
        ],
      }),
    ).toEqual({
      ok: true,
      value: {
        couponCode: "OPENING",
        items: [{ quantity: 2, skuId: skuA.id }],
      },
    });
  });

  it("rejects empty, excessive, and malformed cart items", () => {
    expect(parseCheckoutRequest({ items: [] }).ok).toBe(false);
    expect(
      parseCheckoutRequest({
        items: [{ quantity: 100, skuId: skuA.id }],
      }).ok,
    ).toBe(false);
    expect(
      parseCheckoutRequest({
        items: [{ quantity: 1, skuId: "../sku" }],
      }).ok,
    ).toBe(false);
  });
});

describe("calculatePriceQuote", () => {
  it("calculates server prices and snapshots", () => {
    expect(calculatePriceQuote(baseContext)).toEqual({
      ok: true,
      quote: {
        appliedCoupon: null,
        currency: "THB",
        discountSatang: 0,
        lines: [
          {
            discountSatang: 0,
            lineSubtotalSatang: 4900,
            lineTotalSatang: 4900,
            productNameSnapshot: "Monday Mellow",
            quantity: 1,
            skuCodeSnapshot: "XRZT-MONDAY",
            skuId: skuA.id,
            unitPriceSatang: 4900,
          },
        ],
        subtotalSatang: 4900,
        totalSatang: 4900,
        warnings: [],
      },
    });
  });

  it("rejects inactive/missing SKUs and purchase-limit violations", () => {
    expect(
      calculatePriceQuote({ ...baseContext, skus: [] }),
    ).toEqual({ ok: false, reason: "cart_unavailable" });
    expect(
      calculatePriceQuote({
        ...baseContext,
        requestedItems: [{ quantity: 3, skuId: skuA.id }],
      }),
    ).toEqual({ ok: false, reason: "purchase_limit_exceeded" });
  });

  it("applies percent coupon with maximum discount", () => {
    const result = calculatePriceQuote({
      ...baseContext,
      coupon: {
        code: "OPENING",
        discountType: "percent",
        discountValue: 50,
        endsAt: new Date("2026-08-01T00:00:00.000Z"),
        globalRedemptionCount: 0,
        id: "coupon-1",
        maximumDiscountSatang: 1000,
        minimumAmountSatang: 0,
        perUserLimit: 1,
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        status: "active",
        usageLimit: 10,
        userRedemptionCount: 0,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.discountSatang).toBe(1000);
      expect(result.quote.totalSatang).toBe(3900);
      expect(result.quote.lines[0]?.discountSatang).toBe(1000);
    }
  });

  it("returns one generic coupon failure for invalid windows and limits", () => {
    const result = calculatePriceQuote({
      ...baseContext,
      coupon: {
        code: "OPENING",
        discountType: "fixed",
        discountValue: 1000,
        endsAt: new Date("2026-07-01T00:00:00.000Z"),
        globalRedemptionCount: 10,
        id: "coupon-1",
        maximumDiscountSatang: null,
        minimumAmountSatang: 0,
        perUserLimit: 1,
        startsAt: new Date("2026-06-01T00:00:00.000Z"),
        status: "active",
        usageLimit: 10,
        userRedemptionCount: 1,
      },
    });

    expect(result).toEqual({ ok: false, reason: "coupon_invalid" });
  });

  it("warns when owned or overlapping products are in the cart", () => {
    const skuB = {
      ...skuA,
      id: "22222222-2222-4222-8222-222222222222",
      name: "SEVORA Bundle",
      productIds: [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ],
      purchaseLimit: null,
      skuCode: "XRZT-SEVORA",
    };
    const result = calculatePriceQuote({
      ...baseContext,
      ownedProductIds: new Set([
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ]),
      requestedItems: [
        { quantity: 1, skuId: skuA.id },
        { quantity: 1, skuId: skuB.id },
      ],
      skus: [skuA, skuB],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.quote.warnings).toEqual([
        "cart_contains_owned_products",
        "cart_contains_overlapping_products",
      ]);
    }
  });
});
