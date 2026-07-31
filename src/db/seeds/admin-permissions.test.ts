import { describe, expect, it } from "vitest";

import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { adminPermissionSeedRows } from "./admin-permissions";

describe("adminPermissionSeedRows", () => {
  it("contains every domain permission exactly once", () => {
    const permissionCodes = adminPermissionSeedRows.map(({ code }) => code);

    expect(permissionCodes.toSorted()).toEqual(
      Object.values(ADMIN_PERMISSIONS).toSorted(),
    );
    expect(new Set(permissionCodes).size).toBe(
      adminPermissionSeedRows.length,
    );
  });

  it("provides a non-empty description for every permission", () => {
    expect(
      adminPermissionSeedRows.every(
        ({ description }) => description.trim().length > 0,
      ),
    ).toBe(true);
  });
});
