import { describe, expect, it } from "vitest";

import type { StoreProduct } from "../infrastructure/storefront-repository";
import { filterStoreProducts, parseStoreFilters } from "./store-filter";

function product(input: {
  collectionSlug: string;
  name: string;
  price: number;
  skuType: "bundle" | "collection" | "single";
}): StoreProduct {
  return {
    brandName: "XCRUIZT",
    canonicalPath: null,
    collectionName: input.collectionSlug,
    collectionSlug: input.collectionSlug,
    compatibility: {},
    description: input.name,
    id: input.name,
    images: [],
    isIndexable: true,
    mood: null,
    name: input.name,
    schemaCategory: "SoftwareApplication",
    seoDescription: null,
    seoTitle: null,
    shortDescription: input.name,
    skus: [
      {
        compareAtPriceSatang: null,
        currency: "THB",
        id: `${input.name}-sku`,
        name: input.name,
        priceSatang: input.price,
        skuType: input.skuType,
        slug: input.name,
      },
    ],
    slug: input.name,
  };
}

describe("store filters", () => {
  const products = [
    product({ collectionSlug: "severa", name: "Zeta", price: 200, skuType: "single" }),
    product({ collectionSlug: "prism", name: "Alpha", price: 100, skuType: "bundle" }),
  ];

  it("normalizes supported filters and drops invalid sort values", () => {
    expect(parseStoreFilters({ q: " prism ", sort: "unknown" })).toEqual({
      q: "prism",
      sort: undefined,
    });
  });

  it("filters by collection/type and sorts by server price", () => {
    expect(
      filterStoreProducts(products, { sort: "price_desc" }).map(
        ({ name }) => name,
      ),
    ).toEqual(["Zeta", "Alpha"]);
    expect(
      filterStoreProducts(products, { type: "bundle" }).map(
        ({ name }) => name,
      ),
    ).toEqual(["Alpha"]);
  });
});
