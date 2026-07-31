import "server-only";

import {
  and,
  count,
  eq,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  adminRoles,
  adminUserRoles,
  profiles,
} from "@/db/schema";

export async function listAdminRoleSettings() {
  const [roles, assignments, users] = await Promise.all([
    db
      .select({
        description: adminRoles.description,
        id: adminRoles.id,
        name: adminRoles.name,
      })
      .from(adminRoles)
      .orderBy(adminRoles.name),
    db
      .select({
        roleId: adminUserRoles.roleId,
        roleName: adminRoles.name,
        userId: adminUserRoles.userId,
        username: profiles.username,
      })
      .from(adminUserRoles)
      .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
      .innerJoin(profiles, eq(profiles.id, adminUserRoles.userId))
      .orderBy(profiles.username, adminRoles.name),
    db
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .orderBy(profiles.username),
  ]);

  return { assignments, roles, users };
}

export async function assignAdminRole(input: {
  adminUserId: string;
  roleId: string;
  userId: string;
}): Promise<"already_assigned" | "assigned" | "not_found"> {
  return db.transaction(async (transaction) => {
    const [target] = await transaction
      .select({
        roleName: adminRoles.name,
        username: profiles.username,
      })
      .from(profiles)
      .innerJoin(adminRoles, eq(adminRoles.id, input.roleId))
      .where(eq(profiles.id, input.userId))
      .limit(1);
    if (!target) return "not_found";

    const [created] = await transaction
      .insert(adminUserRoles)
      .values({ roleId: input.roleId, userId: input.userId })
      .onConflictDoNothing({
        target: [adminUserRoles.userId, adminUserRoles.roleId],
      })
      .returning({ userId: adminUserRoles.userId });
    if (!created) return "already_assigned";

    await transaction.insert(adminAuditLogs).values({
      action: "admin.role.assign",
      adminUserId: input.adminUserId,
      afterData: {
        roleId: input.roleId,
        roleName: target.roleName,
        userId: input.userId,
        username: target.username,
      },
      entityId: `${input.userId}:${input.roleId}`,
      entityType: "admin_user_role",
    });
    return "assigned";
  });
}

export async function removeAdminRole(input: {
  adminUserId: string;
  roleId: string;
  userId: string;
}): Promise<"last_super_admin" | "not_found" | "removed"> {
  return db.transaction(async (transaction) => {
    const [assignment] = await transaction
      .select({
        roleName: adminRoles.name,
        username: profiles.username,
      })
      .from(adminUserRoles)
      .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
      .innerJoin(profiles, eq(profiles.id, adminUserRoles.userId))
      .where(
        and(
          eq(adminUserRoles.userId, input.userId),
          eq(adminUserRoles.roleId, input.roleId),
        ),
      )
      .limit(1);
    if (!assignment) return "not_found";

    if (assignment.roleName === "super-admin") {
      const [superAdminCount] = await transaction
        .select({ value: count() })
        .from(adminUserRoles)
        .innerJoin(adminRoles, eq(adminRoles.id, adminUserRoles.roleId))
        .where(eq(adminRoles.name, "super-admin"));
      if (Number(superAdminCount?.value ?? 0) <= 1) {
        return "last_super_admin";
      }
    }

    await transaction
      .delete(adminUserRoles)
      .where(
        and(
          eq(adminUserRoles.userId, input.userId),
          eq(adminUserRoles.roleId, input.roleId),
        ),
      );
    await transaction.insert(adminAuditLogs).values({
      action: "admin.role.remove",
      adminUserId: input.adminUserId,
      beforeData: {
        roleId: input.roleId,
        roleName: assignment.roleName,
        userId: input.userId,
        username: assignment.username,
      },
      entityId: `${input.userId}:${input.roleId}`,
      entityType: "admin_user_role",
    });
    return "removed";
  });
}
