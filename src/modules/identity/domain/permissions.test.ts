import { describe, expect, it } from "vitest";

import {
  ADMIN_PERMISSIONS,
  hasRequiredPermission,
} from "./permissions";

describe("hasRequiredPermission", () => {
  it("allows an administrator with the required permission", () => {
    const grantedPermissions = new Set<string>([
      ADMIN_PERMISSIONS.writeProduct,
    ]);

    expect(
      hasRequiredPermission(
        grantedPermissions,
        ADMIN_PERMISSIONS.writeProduct,
      ),
    ).toBe(true);
  });

  it("denies a normal customer without Admin permissions", () => {
    expect(
      hasRequiredPermission(
        new Set(),
        ADMIN_PERMISSIONS.manageAdminRoles,
      ),
    ).toBe(false);
  });

  it("does not allow one permission to substitute for another", () => {
    const grantedPermissions = new Set<string>([
      ADMIN_PERMISSIONS.readOrders,
    ]);

    expect(
      hasRequiredPermission(
        grantedPermissions,
        ADMIN_PERMISSIONS.refundPayment,
      ),
    ).toBe(false);
  });
});
