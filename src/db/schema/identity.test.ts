import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  adminAuditLogs,
  adminPermissions,
  adminRoles,
  adminUserRoles,
  customerStatus,
  profiles,
  rolePermissions,
} from "./identity";

describe("identity database schema", () => {
  it("defines the approved customer status values", () => {
    expect(customerStatus.enumValues).toEqual(["active", "suspended"]);
  });

  it("defines profiles without a duplicate public users table", () => {
    const profileConfig = getTableConfig(profiles);

    expect(profileConfig.name).toBe("profiles");
    expect(profileConfig.columns.map((column) => column.name)).toEqual([
      "id",
      "username",
      "display_name",
      "avatar_url",
      "email_snapshot",
      "discord_user_id",
      "discord_username",
      "discord_avatar_url",
      "customer_status",
      "created_at",
      "updated_at",
    ]);
  });

  it("requires a unique username for every profile", () => {
    const usernameColumn = getTableConfig(profiles).columns.find(
      (column) => column.name === "username",
    );

    expect(usernameColumn).toMatchObject({
      notNull: true,
      isUnique: true,
    });
  });

  it("defines role and permission tables", () => {
    expect(getTableConfig(adminRoles).name).toBe("admin_roles");
    expect(getTableConfig(adminPermissions).name).toBe("admin_permissions");
    expect(getTableConfig(adminUserRoles).name).toBe("admin_user_roles");
    expect(getTableConfig(rolePermissions).name).toBe("role_permissions");
  });

  it("defines Admin audit log fields from the blueprint", () => {
    const auditConfig = getTableConfig(adminAuditLogs);

    expect(auditConfig.name).toBe("admin_audit_logs");
    expect(auditConfig.columns.map((column) => column.name)).toEqual([
      "id",
      "admin_user_id",
      "action",
      "entity_type",
      "entity_id",
      "before_data",
      "after_data",
      "ip_hash",
      "created_at",
    ]);
    expect(
      auditConfig.columns
        .filter((column) =>
          [
            "id",
            "admin_user_id",
            "action",
            "entity_type",
            "entity_id",
            "created_at",
          ].includes(column.name),
        )
        .every((column) => column.notNull),
    ).toBe(true);
  });

  it("uses composite primary keys for join tables", () => {
    expect(getTableConfig(adminUserRoles).primaryKeys).toHaveLength(1);
    expect(getTableConfig(rolePermissions).primaryKeys).toHaveLength(1);
  });

  it("enables RLS for every public identity table", () => {
    for (const table of [
      profiles,
      adminAuditLogs,
      adminRoles,
      adminPermissions,
      adminUserRoles,
      rolePermissions,
    ]) {
      expect(getTableConfig(table).enableRLS).toBe(true);
    }
  });

  it("allows authenticated customers to read only their own profile", () => {
    const profileConfig = getTableConfig(profiles);

    expect(profileConfig.policies).toHaveLength(1);
    expect(profileConfig.policies[0]).toMatchObject({
      name: "profiles_select_own",
      for: "select",
      to: "authenticated",
    });
  });

  it("indexes foreign keys that are not covered by a primary-key prefix", () => {
    expect(
      getTableConfig(adminUserRoles).indexes.map(
        (databaseIndex) => databaseIndex.config.name,
      ),
    ).toContain("admin_user_roles_role_id_idx");
    expect(
      getTableConfig(rolePermissions).indexes.map(
        (databaseIndex) => databaseIndex.config.name,
      ),
    ).toContain("role_permissions_permission_id_idx");
  });

  it("indexes Admin audit queries by actor and time", () => {
    const auditIndexNames = getTableConfig(adminAuditLogs).indexes.map(
      (databaseIndex) => databaseIndex.config.name,
    );

    expect(auditIndexNames).toEqual(
      expect.arrayContaining([
        "admin_audit_logs_admin_user_id_created_at_idx",
        "admin_audit_logs_created_at_idx",
      ]),
    );
  });
});
