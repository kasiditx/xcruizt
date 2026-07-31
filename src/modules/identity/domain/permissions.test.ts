import { describe, expect, it } from "vitest";

import * as permissions from "./permissions";
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

describe("hasAdminAccess", () => {
  type AdminAccessResolver = (
    grantedPermissions: ReadonlySet<string>,
  ) => boolean;

  const resolver = Reflect.get(
    permissions,
    "hasAdminAccess",
  ) as AdminAccessResolver | undefined;

  it("allows any database-backed Admin permission into the Admin shell", () => {
    expect(
      resolver?.(new Set([ADMIN_PERMISSIONS.publishVersion])),
    ).toBe(true);
  });

  it("denies a customer without database-backed Admin permissions", () => {
    expect(resolver?.(new Set())).toBe(false);
  });

  it("ignores an unknown permission code", () => {
    expect(resolver?.(new Set(["unknown.permission"]))).toBe(false);
  });
});
