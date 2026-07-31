import { describe, expect, it } from "vitest";

import { parseProductVersionInput } from "./product-version-input";

describe("parseProductVersionInput", () => {
  it("normalizes a valid draft version", () => {
    expect(
      parseProductVersionInput({
        changelogMd: "  - Initial production-ready preset  ",
        releaseNotesMd: "",
        version: " 1.0.0 ",
      }),
    ).toEqual({
      ok: true,
      value: {
        changelogMd: "- Initial production-ready preset",
        releaseNotesMd: null,
        version: "1.0.0",
      },
    });
  });

  it.each(["1", "v1.0.0", "1.0", "../1.0.0", "1.0.0+"])(
    "rejects invalid version %s",
    (version) => {
      const result = parseProductVersionInput({
        changelogMd: "Initial release",
        releaseNotesMd: "",
        version,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.version).toBeDefined();
      }
    },
  );

  it("requires a meaningful changelog", () => {
    const result = parseProductVersionInput({
      changelogMd: "short",
      releaseNotesMd: "",
      version: "1.0.0",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.changelogMd).toBeDefined();
    }
  });
});
