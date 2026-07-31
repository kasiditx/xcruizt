import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  adminPermissions,
  adminRoles,
  adminUserRoles,
  profiles,
  rolePermissions,
} from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveCurrentAccount,
  type CurrentAccountResolution,
} from "@/modules/identity/application/current-account";

export async function getCurrentAccountResolution(): Promise<CurrentAccountResolution> {
  const supabase = await createSupabaseServerClient();

  return resolveCurrentAccount({
    async findAdminAuthorizationByUserId(userId) {
      const rows = await db
        .select({
          permissionCode: adminPermissions.code,
          roleName: adminRoles.name,
        })
        .from(adminUserRoles)
        .innerJoin(
          adminRoles,
          eq(adminRoles.id, adminUserRoles.roleId),
        )
        .innerJoin(
          rolePermissions,
          eq(rolePermissions.roleId, adminRoles.id),
        )
        .innerJoin(
          adminPermissions,
          eq(adminPermissions.id, rolePermissions.permissionId),
        )
        .where(eq(adminUserRoles.userId, userId));

      return {
        permissionCodes: rows.map(({ permissionCode }) => permissionCode),
        roleNames: rows.map(({ roleName }) => roleName),
      };
    },
    async getAuthenticatedUserId() {
      const { data, error } = await supabase.auth.getClaims();

      if (error || !data || typeof data.claims.sub !== "string") {
        return null;
      }

      return data.claims.sub;
    },
    async findProfileByUserId(userId) {
      const [profile] = await db
        .select({
          username: profiles.username,
        })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);

      return profile ?? null;
    },
  });
}
