import { describe, expect, it } from "vitest";

import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { adminRoleSeedRows } from "./admin-roles";

describe("adminRoleSeedRows", () => {
  it("defines the four approved Admin roles", () => {
    expect(adminRoleSeedRows.map(({ name }) => name)).toEqual([
      "Support",
      "Catalog Manager",
      "Finance Admin",
      "Super Admin",
    ]);
  });

  it("maps only typed permissions without duplicates", () => {
    const approvedPermissions = new Set(Object.values(ADMIN_PERMISSIONS));

    for (const role of adminRoleSeedRows) {
      expect(role.permissions.length).toBeGreaterThan(0);
      expect(new Set(role.permissions).size).toBe(role.permissions.length);
      expect(
        role.permissions.every((permission) =>
          approvedPermissions.has(permission),
        ),
      ).toBe(true);
    }
  });

  it("grants every typed permission to Super Admin", () => {
    const superAdmin = adminRoleSeedRows.find(
      ({ name }) => name === "Super Admin",
    );

    expect(new Set(superAdmin?.permissions)).toEqual(
      new Set(Object.values(ADMIN_PERMISSIONS)),
    );
  });
});
