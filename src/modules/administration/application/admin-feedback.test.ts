import { describe, expect, it } from "vitest";

import {
  getAdminNoticeTone,
  getAdminValidationMessage,
} from "./admin-feedback";

describe("getAdminNoticeTone", () => {
  it("classifies completed operations as success", () => {
    expect(getAdminNoticeTone("created")).toBe("success");
    expect(getAdminNoticeTone("published")).toBe("success");
    expect(getAdminNoticeTone("revoked")).toBe("success");
  });

  it("keeps recoverable conflicts distinct from failures", () => {
    expect(getAdminNoticeTone("duplicate")).toBe("warning");
    expect(getAdminNoticeTone("already_active")).toBe("warning");
    expect(getAdminNoticeTone("rate_limited")).toBe("warning");
  });

  it("classifies invalid input and provider failures as errors", () => {
    expect(getAdminNoticeTone("invalid")).toBe("error");
    expect(getAdminNoticeTone("provider_failed")).toBe("error");
    expect(getAdminNoticeTone("not_found")).toBe("error");
  });

  it("falls back to an informational tone for unknown codes", () => {
    expect(getAdminNoticeTone("future_notice")).toBe("info");
  });
});

describe("getAdminValidationMessage", () => {
  it("uses a clear required-field message", () => {
    expect(
      getAdminValidationMessage({
        label: "ชื่อ Product",
        validity: { valueMissing: true },
      }),
    ).toBe("กรุณากรอกชื่อ Product");
    expect(
      getAdminValidationMessage({
        label: "Slug",
        validity: { valueMissing: true },
      }),
    ).toBe("กรุณากรอก Slug");
  });

  it("uses selection wording for select controls", () => {
    expect(
      getAdminValidationMessage({
        controlType: "select",
        label: "Product",
        validity: { valueMissing: true },
      }),
    ).toBe("กรุณาเลือก Product");
  });

  it("describes email and length constraints", () => {
    expect(
      getAdminValidationMessage({
        controlType: "email",
        label: "Customer email",
        validity: { typeMismatch: true },
      }),
    ).toBe("กรุณากรอกอีเมลให้ถูกต้อง");
    expect(
      getAdminValidationMessage({
        label: "เหตุผล",
        minLength: 8,
        validity: { tooShort: true },
      }),
    ).toBe("เหตุผลต้องมีอย่างน้อย 8 ตัวอักษร");
  });

  it("uses explicit bounds and pattern guidance", () => {
    expect(
      getAdminValidationMessage({
        label: "Sort order",
        min: "0",
        validity: { rangeUnderflow: true },
      }),
    ).toBe("Sort order ต้องไม่น้อยกว่า 0");
    expect(
      getAdminValidationMessage({
        label: "Slug",
        patternHint: "ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น",
        validity: { patternMismatch: true },
      }),
    ).toBe("ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น");
  });
});
