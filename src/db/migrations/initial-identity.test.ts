import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "src/db/migrations");

function readIdentityMigration() {
  const fileName = readdirSync(migrationsDirectory).find((entry) =>
    entry.endsWith("_initial_identity.sql"),
  );

  if (!fileName) {
    throw new Error("Initial identity migration was not generated.");
  }

  return readFileSync(join(migrationsDirectory, fileName), "utf8");
}

function readAllMigrations() {
  return readdirSync(migrationsDirectory)
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .map((entry) => readFileSync(join(migrationsDirectory, entry), "utf8"))
    .join("\n");
}

describe("initial identity migration", () => {
  it("creates only the approved public identity tables", () => {
    const sql = readIdentityMigration();

    for (const table of [
      "profiles",
      "admin_roles",
      "admin_permissions",
      "admin_user_roles",
      "role_permissions",
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("references but never creates or drops auth.users", () => {
    const sql = readIdentityMigration();

    expect(
      sql.match(/REFERENCES "auth"\."users"\("id"\)/g),
    ).toHaveLength(2);
    expect(sql).not.toMatch(/CREATE TABLE\s+"auth"\."users"/i);
    expect(sql).not.toMatch(/DROP TABLE\s+"auth"\."users"/i);
  });

  it("does not create a public users table", () => {
    expect(readIdentityMigration()).not.toMatch(
      /CREATE TABLE\s+(?:"public"\.)?"users"/i,
    );
  });

  it("enables RLS for every public identity table", () => {
    const sql = readAllMigrations();

    for (const table of [
      "profiles",
      "admin_audit_logs",
      "admin_roles",
      "admin_permissions",
      "admin_user_roles",
      "role_permissions",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `ALTER TABLE (?:\"public\"\\.)?\"${table}\" ENABLE ROW LEVEL SECURITY`,
          "i",
        ),
      );
    }
  });

  it("limits profile reads to the authenticated owner", () => {
    const sql = readAllMigrations();

    expect(sql).toContain('CREATE POLICY "profiles_select_own"');
    expect(sql).toMatch(/FOR SELECT TO "authenticated"/i);
    expect(sql).toMatch(/auth\.uid\(\).*"profiles"\."id"/is);
  });

  it("indexes uncovered foreign-key columns", () => {
    const sql = readAllMigrations();

    expect(sql).toContain(
      'CREATE INDEX "admin_user_roles_role_id_idx"',
    );
    expect(sql).toContain(
      'CREATE INDEX "role_permissions_permission_id_idx"',
    );
  });

  it("adds a required unique username to profiles", () => {
    const sql = readAllMigrations();

    expect(sql).toContain(
      'ALTER TABLE "profiles" ADD COLUMN "username" text NOT NULL',
    );
    expect(sql).toContain(
      'ADD CONSTRAINT "profiles_username_unique" UNIQUE("username")',
    );
  });

  it("creates protected and indexed Admin audit logs", () => {
    const sql = readAllMigrations();

    expect(sql).toContain('CREATE TABLE "admin_audit_logs"');
    expect(sql).toMatch(
      /ALTER TABLE "admin_audit_logs" ENABLE ROW LEVEL SECURITY/i,
    );
    expect(sql).toContain(
      'CREATE INDEX "admin_audit_logs_admin_user_id_created_at_idx"',
    );
    expect(sql).toContain(
      'CREATE INDEX "admin_audit_logs_created_at_idx"',
    );
  });
});
