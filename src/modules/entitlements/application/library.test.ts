import { describe, expect, it } from "vitest";

describe("buildLibraryItems", () => {
  it("returns only active ownership with customer-safe product fields", async () => {
    const libraryModule = await import("./library").catch(() => null);
    const items = libraryModule?.buildLibraryItems([
      {
        changelogMd: "- Improved night clarity",
        collectionName: "CRUIZCTRL",
        entitlementId: "entitlement-active",
        grantedAt: new Date("2026-07-31T08:00:00.000Z"),
        productId: "product-active",
        productName: "CRUIZCTRL Night",
        productSlug: "cruizctrl-night",
        releaseNotesMd: "Re-download the package.",
        shortDescription: "Night-time clarity preset.",
        status: "active",
        version: "1.2.0",
      },
      {
        changelogMd: "- Old",
        collectionName: "PRISMUTE",
        entitlementId: "entitlement-revoked",
        grantedAt: new Date("2026-07-30T08:00:00.000Z"),
        productId: "product-revoked",
        productName: "Old preset",
        productSlug: "old-preset",
        releaseNotesMd: null,
        shortDescription: "No longer owned.",
        status: "revoked",
        version: "1.0.0",
      },
    ]);

    expect(items).toEqual([
      {
        changelogMd: "- Improved night clarity",
        collectionName: "CRUIZCTRL",
        entitlementId: "entitlement-active",
        grantedAt: new Date("2026-07-31T08:00:00.000Z"),
        productId: "product-active",
        productName: "CRUIZCTRL Night",
        productSlug: "cruizctrl-night",
        releaseNotesMd: "Re-download the package.",
        shortDescription: "Night-time clarity preset.",
        version: "1.2.0",
      },
    ]);
  });

  it("supports an owned product before a current version is published", async () => {
    const libraryModule = await import("./library").catch(() => null);
    const items = libraryModule?.buildLibraryItems([
      {
        changelogMd: null,
        collectionName: null,
        entitlementId: "entitlement-active",
        grantedAt: new Date("2026-07-31T08:00:00.000Z"),
        productId: "product-active",
        productName: "Standalone",
        productSlug: "standalone",
        releaseNotesMd: null,
        shortDescription: "Standalone preset.",
        status: "active",
        version: null,
      },
    ]);

    expect(items?.[0]?.version).toBeNull();
  });
});
