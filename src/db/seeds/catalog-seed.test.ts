import { describe, expect, it } from "vitest";

import {
  catalogSeedCollections,
  catalogSeedProducts,
  catalogSeedSkus,
  catalogSeedVersions,
} from "./catalog";

describe("catalog seed", () => {
  it("contains the requested collections and product counts", () => {
    expect(catalogSeedCollections.map(({ name }) => name)).toEqual([
      "CRUIZCTRL",
      "PRISMUTE",
      "SEVORA",
    ]);
    expect(catalogSeedCollections.map(({ tagline }) => tagline)).toEqual([
      "10 PRESETS",
      "5 PRESETS",
      "7 DAYS · 7 MOODS",
    ]);
    expect(catalogSeedProducts).toHaveLength(22);
    expect(
      catalogSeedProducts.filter(
        ({ collectionSlug }) => collectionSlug === "cruizctrl",
      ),
    ).toHaveLength(10);
    expect(
      catalogSeedProducts.filter(
        ({ collectionSlug }) => collectionSlug === "prismute",
      ),
    ).toHaveLength(5);
    expect(
      catalogSeedProducts.filter(
        ({ collectionSlug }) => collectionSlug === "sevora",
      ),
    ).toHaveLength(7);
  });

  it("keeps product slugs deterministic and unique", () => {
    const slugs = catalogSeedProducts.map(({ slug }) => slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("monday-mellow");
    expect(slugs).toContain("sunday-scarlet");
  });

  it("contains the requested SKU prices and grant shapes", () => {
    expect(catalogSeedSkus).toHaveLength(26);
    expect(
      catalogSeedSkus.filter(({ skuType }) => skuType === "single"),
    ).toHaveLength(22);
    expect(
      catalogSeedSkus.filter(({ skuType }) => skuType === "collection"),
    ).toHaveLength(3);
    expect(
      catalogSeedSkus.filter(({ skuType }) => skuType === "bundle"),
    ).toHaveLength(1);

    expect(
      catalogSeedSkus.find(({ skuCode }) => skuCode === "XRZT-CC-FULL"),
    ).toMatchObject({
      compareAtPriceSatang: 49_000,
      priceSatang: 29_900,
      productSlugs: expect.arrayContaining(["cruizctrl-01", "cruizctrl-10"]),
    });
    expect(
      catalogSeedSkus.find(({ name }) => name === "Monday Mellow"),
    ).toMatchObject({ skuCode: "XRZT-SV-MON", priceSatang: 4_900 });
    expect(
      catalogSeedSkus.find(({ skuCode }) => skuCode === "XRZT-ALL-FULL"),
    ).toMatchObject({
      compareAtPriceSatang: 107_800,
      priceSatang: 59_900,
      productSlugs: expect.arrayContaining(["sunday-scarlet"]),
    });
    expect(catalogSeedSkus.every(({ productSlugs }) => productSlugs.length > 0)).toBe(true);
  });

  it("creates one draft 1.0.0 version plan per preset", () => {
    expect(catalogSeedVersions).toHaveLength(22);
    expect(new Set(catalogSeedVersions.map(({ productSlug }) => productSlug)).size).toBe(22);
    expect(catalogSeedVersions.every(({ version }) => version === "1.0.0")).toBe(true);
  });
});
