import { describe, expect, it } from "vitest";

import { hasExpectedFileSignature } from "./file-signature";

describe("hasExpectedFileSignature", () => {
  it("recognizes ZIP, PDF and Windows executable signatures", () => {
    expect(
      hasExpectedFileSignature(
        "preset.zip",
        new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      ),
    ).toBe(true);
    expect(
      hasExpectedFileSignature(
        "preset.ini",
        new TextEncoder().encode("[REShade]\nTechniques=\n"),
      ),
    ).toBe(true);
    expect(
      hasExpectedFileSignature(
        "collection.rar",
        new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
      ),
    ).toBe(true);
    expect(
      hasExpectedFileSignature(
        "guide.pdf",
        new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      ),
    ).toBe(true);
    expect(
      hasExpectedFileSignature(
        "installer.exe",
        new Uint8Array([0x4d, 0x5a]),
      ),
    ).toBe(true);
  });

  it("rejects extension and content mismatches", () => {
    expect(
      hasExpectedFileSignature(
        "preset.zip",
        new Uint8Array([0x4d, 0x5a]),
      ),
    ).toBe(false);
    expect(
      hasExpectedFileSignature(
        "checksum.txt",
        new Uint8Array([0x61, 0, 0x62]),
      ),
    ).toBe(false);
    expect(
      hasExpectedFileSignature(
        "preset.ini",
        new Uint8Array([0x61, 0, 0x62]),
      ),
    ).toBe(false);
    expect(
      hasExpectedFileSignature(
        "collection.rar",
        new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      ),
    ).toBe(false);
  });
});
