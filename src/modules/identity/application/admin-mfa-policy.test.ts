import { describe, expect, it } from "vitest";

import {
  isAdminMfaRequired,
  resolveAdminMfaNextPath,
} from "./admin-mfa-policy";

describe("Admin MFA policy", () => {
  it("enforces AAL2 outside local development", () => {
    expect(isAdminMfaRequired("local", "aal1")).toBe(false);
    expect(isAdminMfaRequired("preview", "aal1")).toBe(true);
    expect(isAdminMfaRequired("staging", null)).toBe(true);
    expect(isAdminMfaRequired("production", "aal2")).toBe(false);
  });

  it("only accepts local Admin destinations", () => {
    expect(resolveAdminMfaNextPath("/admin/orders?status=paid")).toBe(
      "/admin/orders?status=paid",
    );
    expect(resolveAdminMfaNextPath("/account/library")).toBe("/admin");
    expect(resolveAdminMfaNextPath("//evil.example")).toBe("/admin");
    expect(resolveAdminMfaNextPath("/admin\\evil")).toBe("/admin");
  });
});
