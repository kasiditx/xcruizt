import { describe, expect, it } from "vitest";

import * as authRedirect from "./auth-redirect";
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

  it("uses the home page when Login has no destination", () => {
    expect(resolveSafeAuthRedirect()).toBe("/");
  });
});

describe("resolveLoginPageRedirect", () => {
  type LoginRedirectResolver = (
    accountStatus: "anonymous" | "profile_required" | "ready",
    nextPath: string,
  ) => string | null;

  const resolver = Reflect.get(
    authRedirect,
    "resolveLoginPageRedirect",
  ) as LoginRedirectResolver | undefined;

  it("keeps an anonymous visitor on the Login page", () => {
    expect(resolver?.("anonymous", "/account/library")).toBeNull();
  });

  it("sends a signed-in account to the safe destination", () => {
    expect(resolver?.("ready", "/admin")).toBe("/admin");
  });

  it("sends an incomplete account through profile completion", () => {
    expect(
      resolver?.("profile_required", "/account/library?tab=owned"),
    ).toBe(
      "/auth/complete-profile?next=%2Faccount%2Flibrary%3Ftab%3Downed",
    );
  });
});
