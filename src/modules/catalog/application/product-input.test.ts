import { describe, expect, it } from "vitest";

import { parseProductInput } from "./product-input";

const validInput = {
  brandName: " XCRUIZT ",
  collectionId: "",
  compatibilityJson: '{"platform":"FiveM","reshade":"6.x"}',
  description: "รายละเอียด Product ที่เพียงพอสำหรับหน้าสินค้า",
  isIndexable: "on",
  mood: " Mellow ",
  name: " Monday Mellow ",
  schemaCategory: " FiveM ReShade Preset ",
  seoDescription: "",
  seoTitle: "",
  shortDescription: "Preset โทนอุ่นสำหรับการเล่นช่วงเย็น",
  slug: " monday-mellow ",
  status: "draft",
};

describe("parseProductInput", () => {
  it("normalizes product fields and derives canonical path", () => {
    expect(parseProductInput(validInput)).toEqual({
      ok: true,
      value: {
        brandName: "XCRUIZT",
        canonicalPath: "/products/monday-mellow",
        collectionId: null,
        compatibility: {
          platform: "FiveM",
          reshade: "6.x",
        },
        description: "รายละเอียด Product ที่เพียงพอสำหรับหน้าสินค้า",
        isIndexable: true,
        mood: "Mellow",
        name: "Monday Mellow",
        schemaCategory: "FiveM ReShade Preset",
        seoDescription: null,
        seoTitle: null,
        shortDescription: "Preset โทนอุ่นสำหรับการเล่นช่วงเย็น",
        slug: "monday-mellow",
        status: "draft",
      },
    });
  });

  it("rejects malformed compatibility JSON", () => {
    const result = parseProductInput({
      ...validInput,
      compatibilityJson: "{platform:FiveM}",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.compatibilityJson).toBeDefined();
    }
  });

  it("rejects arrays and oversized compatibility payloads", () => {
    const arrayResult = parseProductInput({
      ...validInput,
      compatibilityJson: '["FiveM"]',
    });
    const oversizedResult = parseProductInput({
      ...validInput,
      compatibilityJson: JSON.stringify({
        value: "x".repeat(10_001),
      }),
    });

    expect(arrayResult.ok).toBe(false);
    expect(oversizedResult.ok).toBe(false);
  });

  it("validates optional collection identifiers", () => {
    const result = parseProductInput({
      ...validInput,
      collectionId: "not-a-uuid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.collectionId).toBeDefined();
    }
  });
});
