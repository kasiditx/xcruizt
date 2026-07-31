import { describe, expect, it } from "vitest";

import { parseProfileInput } from "./profile-input";

describe("profile input", () => {
  it("normalizes a blank display name to null", () => {
    expect(parseProfileInput({ displayName: "   " })).toEqual({
      ok: true,
      value: { displayName: null },
    });
  });

  it("accepts a bounded plain-text display name", () => {
    expect(parseProfileInput({ displayName: "  Kasidit  " })).toEqual({
      ok: true,
      value: { displayName: "Kasidit" },
    });
  });

  it("rejects markup, control characters and oversized input", () => {
    expect(parseProfileInput({ displayName: "<script>" }).ok).toBe(false);
    expect(parseProfileInput({ displayName: "line\nbreak" }).ok).toBe(false);
    expect(parseProfileInput({ displayName: "x".repeat(81) }).ok).toBe(false);
  });
});
