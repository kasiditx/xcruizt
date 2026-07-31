import { inArray } from "drizzle-orm";
import { config } from "dotenv";

import { createDatabaseConnection } from "@/db/connection";
import {
  adminPermissions,
  adminRoles,
  rolePermissions,
} from "@/db/schema";
import { parseDatabaseRuntimeEnvironment } from "@/lib/env/database";

import { adminPermissionSeedRows } from "./admin-permissions";
import { adminRoleSeedRows } from "./admin-roles";

config({ path: ".env.local", quiet: true });

const { DATABASE_URL } = parseDatabaseRuntimeEnvironment(process.env);
const connection = createDatabaseConnection(DATABASE_URL);

async function main(): Promise<void> {
  try {
    await connection.db.transaction(async (transaction) => {
      await transaction
        .insert(adminPermissions)
        .values(adminPermissionSeedRows)
        .onConflictDoNothing({ target: adminPermissions.code });

      await transaction
        .insert(adminRoles)
        .values(
          adminRoleSeedRows.map(({ description, name }) => ({
            description,
            name,
          })),
        )
        .onConflictDoNothing({ target: adminRoles.name });

      const persistedRoles = await transaction
        .select({
          id: adminRoles.id,
          name: adminRoles.name,
        })
        .from(adminRoles)
        .where(
          inArray(
            adminRoles.name,
            adminRoleSeedRows.map(({ name }) => name),
          ),
        );
      const persistedPermissions = await transaction
        .select({
          code: adminPermissions.code,
          id: adminPermissions.id,
        })
        .from(adminPermissions)
        .where(
          inArray(
            adminPermissions.code,
            adminPermissionSeedRows.map(({ code }) => code),
          ),
        );

      const roleIdByName = new Map(
        persistedRoles.map(({ id, name }) => [name, id]),
      );
      const permissionIdByCode = new Map(
        persistedPermissions.map(({ code, id }) => [code, id]),
      );
      const mappings = adminRoleSeedRows.flatMap((role) => {
        const roleId = roleIdByName.get(role.name);

        if (!roleId) {
          throw new Error(`Admin role seed failed for ${role.name}.`);
        }

        return role.permissions.map((permissionCode) => {
          const permissionId = permissionIdByCode.get(permissionCode);

          if (!permissionId) {
            throw new Error(
              `Admin permission seed failed for ${permissionCode}.`,
            );
          }

          return {
            permissionId,
            roleId,
          };
        });
      });

      await transaction
        .insert(rolePermissions)
        .values(mappings)
        .onConflictDoNothing({
          target: [
            rolePermissions.roleId,
            rolePermissions.permissionId,
          ],
        });
    });
  } finally {
    await connection.close();
  }
}

void main().catch(() => {
  console.error("Failed to seed Admin authorization.");
  process.exitCode = 1;
});
