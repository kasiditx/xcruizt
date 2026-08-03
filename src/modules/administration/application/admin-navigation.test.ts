import { describe, expect, it } from "vitest";

import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { getAdminNavigationGroups } from "./admin-navigation";

function visiblePaths(permissionCodes: string[]) {
  return getAdminNavigationGroups(permissionCodes).flatMap((group) =>
    group.items.map((item) => item.href),
  );
}

describe("getAdminNavigationGroups", () => {
  it("keeps universal admin destinations visible", () => {
    expect(visiblePaths([])).toEqual(["/admin", "/admin/mfa"]);
  });

  it("shows catalog destinations only to catalog administrators", () => {
    const paths = visiblePaths([ADMIN_PERMISSIONS.writeProduct]);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/admin/catalog/collections",
        "/admin/catalog/products",
        "/admin/catalog/skus",
        "/admin/catalog/versions",
        "/admin/catalog/media",
      ]),
    );
    expect(paths).not.toContain("/admin/refunds");
  });

  it("shows Discord when either Discord permission is granted", () => {
    expect(
      visiblePaths([ADMIN_PERMISSIONS.manageDiscordSync]),
    ).toContain("/admin/discord");
    expect(
      visiblePaths([ADMIN_PERMISSIONS.writeDiscordMapping]),
    ).toContain("/admin/discord");
  });
});
