import { createDatabaseConnection } from "@/db/connection";
import { adminPermissions } from "@/db/schema";
import { parseDatabaseRuntimeEnvironment } from "@/lib/env/database";
import { config } from "dotenv";

import { adminPermissionSeedRows } from "./admin-permissions";

config({ path: ".env.local", quiet: true });

const { DATABASE_URL } = parseDatabaseRuntimeEnvironment(process.env);
const connection = createDatabaseConnection(DATABASE_URL);

async function main(): Promise<void> {
  try {
    await connection.db
      .insert(adminPermissions)
      .values(adminPermissionSeedRows)
      .onConflictDoNothing({ target: adminPermissions.code });
  } finally {
    await connection.close();
  }
}

void main().catch(() => {
  console.error("Failed to seed Admin permissions.");
  process.exitCode = 1;
});
