import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { parseDatabaseMigrationEnvironment } from "./src/lib/env/database";

config({ path: ".env.local", quiet: true });

const migrationEnvironment = process.env.DATABASE_DIRECT_URL
  ? parseDatabaseMigrationEnvironment(process.env)
  : undefined;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  strict: true,
  verbose: true,
  ...(migrationEnvironment
    ? {
        dbCredentials: {
          url: migrationEnvironment.DATABASE_DIRECT_URL,
        },
      }
    : {}),
});
