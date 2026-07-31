import { describe, expect, it } from "vitest";

import { parseFileUploadInput } from "./file-upload-input";

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
