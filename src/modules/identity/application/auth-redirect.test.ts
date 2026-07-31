import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIGNED_IN_PATH,
  resolveSafeAuthRedirect,
} from "./auth-redirect";

describe("resolveSafeAuthRedirect", () => {
  it.each([
    ["/account/library", "/account/library"],
    ["/account/orders?status=paid", "/account/orders?status=paid"],
    ["/admin#orders", "/admin#orders"],
  ])("allows local application path %s", (candidate, expected) => {
    expect(resolveSafeAuthRedirect(candidate)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "account/library",
    "//attacker.example/path",
    "https://attacker.example/path",
    "/\\attacker.example/path",
  ])("falls back for unsafe redirect %s", (candidate) => {
    expect(resolveSafeAuthRedirect(candidate)).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});
