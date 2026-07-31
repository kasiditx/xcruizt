import { describe, expect, it } from "vitest";

import { parseCollectionInput } from "./collection-input";

describe("parseCollectionInput", () => {
  it("normalizes a valid collection form", () => {
    expect(
      parseCollectionInput({
        accentKey: "  violet  ",
        description: "  Presets สำหรับเมืองที่ต้องการบรรยากาศชัดเจน  ",
        name: "  SEVORA  ",
        seoDescription: "",
        seoTitle: "  SEVORA Collection  ",
        slug: "  sevora  ",
        sortOrder: "2",
        status: "draft",
        tagline: "  7 DAYS · 7 MOODS  ",
      }),
    ).toEqual({
      ok: true,
      value: {
        accentKey: "violet",
        description: "Presets สำหรับเมืองที่ต้องการบรรยากาศชัดเจน",
        name: "SEVORA",
        seoDescription: null,
        seoTitle: "SEVORA Collection",
        slug: "sevora",
        sortOrder: 2,
        status: "draft",
        tagline: "7 DAYS · 7 MOODS",
      },
    });
  });

  it("rejects unsafe slugs and negative sort order", () => {
    const result = parseCollectionInput({
      accentKey: "",
      description: "รายละเอียด Collection ที่ยาวเพียงพอสำหรับแสดงผล",
      name: "SEVORA",
      seoDescription: "",
      seoTitle: "",
      slug: "../SEVORA",
      sortOrder: "-1",
      status: "published",
      tagline: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.slug).toBeDefined();
      expect(result.fieldErrors.sortOrder).toBeDefined();
    }
  });

  it("accepts only explicit catalog statuses", () => {
    const result = parseCollectionInput({
      accentKey: "",
      description: "รายละเอียด Collection ที่ยาวเพียงพอสำหรับแสดงผล",
      name: "SEVORA",
      seoDescription: "",
      seoTitle: "",
      slug: "sevora",
      sortOrder: "0",
      status: "deleted",
      tagline: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.status).toBeDefined();
    }
  });
});
