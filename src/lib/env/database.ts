import { z } from "zod";

const postgresqlUrl = z.string().min(1).superRefine((value, context) => {
  try {
    const protocol = new URL(value).protocol;

    if (protocol !== "postgres:" && protocol !== "postgresql:") {
      context.addIssue({
        code: "custom",
        message: "Expected a PostgreSQL connection URL.",
      });
    }
  } catch {
    context.addIssue({
      code: "custom",
      message: "Expected a valid PostgreSQL connection URL.",
    });
  }
});

const runtimeEnvironmentSchema = z.object({
  DATABASE_URL: postgresqlUrl,
});

const migrationEnvironmentSchema = z.object({
  DATABASE_DIRECT_URL: postgresqlUrl,
});

export function parseDatabaseRuntimeEnvironment(
  values: Record<string, string | undefined>,
) {
  return runtimeEnvironmentSchema.parse(values);
}

export function parseDatabaseMigrationEnvironment(
  values: Record<string, string | undefined>,
) {
  return migrationEnvironmentSchema.parse(values);
}
