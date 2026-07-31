import { describe, expect, it } from "vitest";

import { parseSkuInput } from "./sku-input";

const productId = "11111111-1111-4111-8111-111111111111";

const validInput = {
  compareAtPriceThaiBaht: "79.00",
  currency: "THB",
  name: "Monday Mellow",
  priceThaiBaht: "49.00",
  productIds: [productId, productId],
  purchaseLimit: "1",
  skuCode: " xrzt-monday-mellow ",
  skuType: "single",
  slug: " monday-mellow ",
  status: "draft",
  stripePriceId: "",
};

describe("parseSkuInput", () => {
  it("converts THB to integer satang and deduplicates grants", () => {
    expect(parseSkuInput(validInput)).toEqual({
      ok: true,
      value: {
        compareAtPriceSatang: 7900,
        currency: "THB",
        name: "Monday Mellow",
        priceSatang: 4900,
        productIds: [productId],
        purchaseLimit: 1,
        skuCode: "XRZT-MONDAY-MELLOW",
        skuType: "single",
        slug: "monday-mellow",
        status: "draft",
        stripePriceId: null,
      },
    });
  });

  it("rejects fractional satang and negative prices", () => {
    const fraction = parseSkuInput({
      ...validInput,
      priceThaiBaht: "49.999",
    });
    const negative = parseSkuInput({
      ...validInput,
      priceThaiBaht: "-1",
    });

    expect(fraction.ok).toBe(false);
    expect(negative.ok).toBe(false);
  });

  it("requires at least one valid Product grant", () => {
    const empty = parseSkuInput({ ...validInput, productIds: [] });
    const invalid = parseSkuInput({
      ...validInput,
      productIds: ["not-a-uuid"],
    });

    expect(empty.ok).toBe(false);
    expect(invalid.ok).toBe(false);
  });

  it("requires compare-at price to exceed the selling price", () => {
    const result = parseSkuInput({
      ...validInput,
      compareAtPriceThaiBaht: "39",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.compareAtPriceThaiBaht).toBeDefined();
    }
  });
});
