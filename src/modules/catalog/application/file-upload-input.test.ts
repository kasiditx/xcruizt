import { describe, expect, it } from "vitest";

import {
  parseFileUploadInput,
  parseSkuPackageUploadInput,
} from "./file-upload-input";

const validInput = {
  contentType: "application/zip",
  fileRole: "main_package",
  fileSizeBytes: 4_096,
  originalFilename: "preset.zip",
  sha256: "a".repeat(64),
  sha256Base64: "YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=",
  versionId: "018f47a5-4e3e-7b6c-8e9f-0123456789ab",
};

describe("parseFileUploadInput", () => {
  it("accepts a ZIP main package", () => {
    expect(parseFileUploadInput(validInput)).toEqual({
      ok: true,
      value: validInput,
    });
  });

  it("rejects a file role and extension mismatch", () => {
    expect(
      parseFileUploadInput({
        ...validInput,
        fileRole: "guide",
      }),
    ).toEqual({
      fieldErrors: {
        originalFilename: ["ชนิดไฟล์ไม่ตรงกับ File role"],
      },
      ok: false,
    });
  });

  it("rejects oversized files and malformed hashes", () => {
    const result = parseFileUploadInput({
      ...validInput,
      fileSizeBytes: 251 * 1024 * 1024,
      sha256: "bad",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.fileSizeBytes).toBeDefined();
      expect(result.fieldErrors.sha256).toBeDefined();
    }
  });
});

describe("parseSkuPackageUploadInput", () => {
  const base = {
    contentType: "text/plain",
    fileRole: "main_package",
    fileSizeBytes: 67_000,
    originalFilename: "!XRZT-Cruizctrl01.ini",
    sha256: "a".repeat(64),
    sha256Base64: "YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=",
    skuId: "018f47a5-4e3e-7b6c-8e9f-0123456789ab",
  };

  it("accepts an INI package for a single SKU", () => {
    expect(parseSkuPackageUploadInput(base, "single")).toEqual({
      ok: true,
      value: base,
    });
  });

  it("accepts a RAR package for collection and bundle SKUs", () => {
    const rar = {
      ...base,
      contentType: "application/vnd.rar",
      originalFilename: "cruizctrl-full-collection.rar",
    };

    expect(parseSkuPackageUploadInput(rar, "collection")).toEqual({
      ok: true,
      value: rar,
    });
    expect(parseSkuPackageUploadInput(rar, "bundle")).toEqual({
      ok: true,
      value: rar,
    });
  });

  it("rejects a package extension that does not match SKU type", () => {
    const result = parseSkuPackageUploadInput(
      { ...base, originalFilename: "cruizctrl-full-collection.rar" },
      "single",
    );

    expect(result).toEqual({
      fieldErrors: {
        originalFilename: ["Single package ต้องเป็นไฟล์ .ini"],
      },
      ok: false,
    });
  });
});
