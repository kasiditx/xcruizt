import { describe, expect, it } from "vitest";

import { resolvePublicMediaSource } from "./media-url";

describe("resolvePublicMediaSource", () => {
  it("allows same-site paths and the configured media origin", () => {
    expect(
      resolvePublicMediaSource(
        "/media/product.webp",
        "https://xcruizt.example",
      ),
    ).toBe("/media/product.webp");
    expect(
      resolvePublicMediaSource(
        "https://media.xcruizt.example/product.webp",
        "https://xcruizt.example",
        "https://media.xcruizt.example",
      ),
    ).toBe("https://media.xcruizt.example/product.webp");
  });

  it.each([
    "//attacker.example/image.webp",
    "http://media.xcruizt.example/image.webp",
    "https://attacker.example/image.webp",
    "https://user:pass@media.xcruizt.example/image.webp",
  ])("rejects an unapproved source %s", (source) => {
    expect(
      resolvePublicMediaSource(
        source,
        "https://xcruizt.example",
        "https://media.xcruizt.example",
      ),
    ).toBeNull();
  });
});
