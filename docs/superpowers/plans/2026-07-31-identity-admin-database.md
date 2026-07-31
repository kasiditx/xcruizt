# XCRUIZT Identity and Admin Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reviewable Drizzle/PostgreSQL foundation for Supabase-backed
profiles and database-authorized Admin roles without executing a live migration.

**Architecture:** Next.js server runtime connects through Supabase Transaction
Pooler with postgres-js prepared statements disabled. Drizzle Kit uses a
separate direct or Session Pooler URL for migrations. Supabase owns
`auth.users`; Drizzle manages only XCRUIZT objects in `public` and references
Auth identities by UUID.

**Tech Stack:** Next.js 16.2.12, TypeScript 5.9.3, pnpm 11.9.0, PostgreSQL,
Supabase, Drizzle ORM 0.45.2, Drizzle Kit 0.31.10, postgres-js 3.4.9, Zod 4.4.3,
Vitest 4.1.10, tsx 4.23.1

## Global Constraints

- Runtime connection: Supabase Shared Transaction Pooler on port `6543`.
- Runtime postgres-js option: `prepare: false`.
- Migration connection: `DATABASE_DIRECT_URL` using Direct or Session Pooler on
  port `5432`.
- Never create, alter, or drop `auth.users`.
- Never create a sample `public.users`.
- Generate and review migration; do not execute it against Supabase.
- Real credentials belong in `.env.local`; never commit or print them.
- Permission codes remain owned by
  `src/modules/identity/domain/permissions.ts`.
- Follow RED → GREEN → REFACTOR for every production behavior.
- Do not commit during execution; user has not authorized Git commits.

---

## File Map

### Create

- `drizzle.config.ts` — Drizzle Kit schema, output, dialect, and optional
  migration credentials
- `src/lib/env/database.ts` — runtime and migration database URL validation
- `src/lib/env/database.test.ts` — database environment contract tests
- `src/db/schema/identity.ts` — profile and Admin authorization tables
- `src/db/schema/index.ts` — schema public exports
- `src/db/schema/identity.test.ts` — schema contract tests
- `src/db/client-options.ts` — testable Transaction Pooler client options
- `src/db/client-options.test.ts` — prepared-statement compatibility test
- `src/db/client.ts` — server-only postgres-js/Drizzle client
- `src/db/seeds/admin-permissions.ts` — permission rows derived from domain codes
- `src/db/seeds/admin-permissions.test.ts` — exhaustive seed contract test
- `src/db/seeds/run-admin-permissions.ts` — explicit seed entry point
- `src/db/migrations/0000_initial_identity.sql` — reviewed generated migration
- `src/db/migrations/meta/*` — Drizzle migration metadata
- `src/db/migrations/initial-identity.test.ts` — SQL safety assertions

### Modify

- `package.json` — dependencies and DB scripts
- `pnpm-lock.yaml` — resolved dependency graph
- `.env.example` — safe runtime and migration variable placeholders
- `README.md` — DB generation, review, migration, and seed commands

---

### Task 1: Dependencies and Database Environment Contracts

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/env/database.test.ts`
- Create: `src/lib/env/database.ts`
- Modify: `.env.example`

**Interfaces:**

- Produces:
  - `parseDatabaseRuntimeEnvironment(values):
    { DATABASE_URL: string }`
  - `parseDatabaseMigrationEnvironment(values):
    { DATABASE_DIRECT_URL: string }`
- Consumes: Zod 4.4.3

- [ ] **Step 1: Install exact dependencies with pnpm**

Run:

```bash
pnpm add drizzle-orm@0.45.2 postgres@3.4.9
pnpm add --save-dev drizzle-kit@0.31.10 dotenv@17.4.2 tsx@4.23.1
```

Expected: `package.json` and `pnpm-lock.yaml` update; no peer errors claimed yet.

- [ ] **Step 2: Write failing database environment tests**

Create `src/lib/env/database.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  parseDatabaseMigrationEnvironment,
  parseDatabaseRuntimeEnvironment,
} from "./database";

describe("parseDatabaseRuntimeEnvironment", () => {
  it("accepts a PostgreSQL runtime URL", () => {
    expect(
      parseDatabaseRuntimeEnvironment({
        DATABASE_URL:
          "postgresql://user:password@pooler.example.com:6543/postgres",
      }),
    ).toEqual({
      DATABASE_URL:
        "postgresql://user:password@pooler.example.com:6543/postgres",
    });
  });

  it("rejects a missing runtime URL", () => {
    expect(() => parseDatabaseRuntimeEnvironment({})).toThrow("DATABASE_URL");
  });

  it("rejects a non-PostgreSQL runtime URL", () => {
    expect(() =>
      parseDatabaseRuntimeEnvironment({
        DATABASE_URL: "https://example.com/database",
      }),
    ).toThrow("PostgreSQL");
  });
});

describe("parseDatabaseMigrationEnvironment", () => {
  it("accepts a separate PostgreSQL migration URL", () => {
    expect(
      parseDatabaseMigrationEnvironment({
        DATABASE_DIRECT_URL:
          "postgresql://user:password@db.example.com:5432/postgres",
      }),
    ).toEqual({
      DATABASE_DIRECT_URL:
        "postgresql://user:password@db.example.com:5432/postgres",
    });
  });

  it("does not fall back to DATABASE_URL", () => {
    expect(() =>
      parseDatabaseMigrationEnvironment({
        DATABASE_URL:
          "postgresql://user:password@pooler.example.com:6543/postgres",
      }),
    ).toThrow("DATABASE_DIRECT_URL");
  });
});
```

- [ ] **Step 3: Run test and verify RED**

Run:

```bash
pnpm test src/lib/env/database.test.ts
```

Expected: FAIL because `./database` does not exist.

- [ ] **Step 4: Add minimal database environment parser**

Create `src/lib/env/database.ts`:

```ts
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
```

- [ ] **Step 5: Run focused test and verify GREEN**

Run:

```bash
pnpm test src/lib/env/database.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 6: Add safe environment examples**

Append to `.env.example`:

```dotenv
# PostgreSQL runtime: Supabase Transaction Pooler, port 6543
DATABASE_URL=

# Drizzle migrations: Direct or Session Pooler, port 5432
DATABASE_DIRECT_URL=
```

Do not add the project ref, host, password, or complete URI.

- [ ] **Step 7: Review checkpoint**

Run:

```bash
git diff -- package.json pnpm-lock.yaml .env.example src/lib/env
```

Expected: only dependency, environment parser, tests, and safe placeholders.

---

### Task 2: Identity and Admin Schema

**Files:**

- Create: `src/db/schema/identity.test.ts`
- Create: `src/db/schema/identity.ts`
- Create: `src/db/schema/index.ts`

**Interfaces:**

- Produces:
  - `customerStatus`
  - `profiles`
  - `adminRoles`
  - `adminPermissions`
  - `adminUserRoles`
  - `rolePermissions`
- Consumes: no managed Auth table; foreign keys to `auth.users.id` are added
  explicitly in the reviewed migration

- [ ] **Step 1: Write failing schema contract test**

Create `src/db/schema/identity.test.ts`:

```ts
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  adminPermissions,
  adminRoles,
  adminUserRoles,
  customerStatus,
  profiles,
  rolePermissions,
} from "./identity";

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("identity database schema", () => {
  it("defines the approved customer status values", () => {
    expect(customerStatus.enumValues).toEqual(["active", "suspended"]);
  });

  it("defines profiles without a duplicate public users table", () => {
    expect(getTableConfig(profiles).name).toBe("profiles");
    expect(columnNames(profiles)).toEqual([
      "id",
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

  it("defines role and permission tables", () => {
    expect(getTableConfig(adminRoles).name).toBe("admin_roles");
    expect(getTableConfig(adminPermissions).name).toBe("admin_permissions");
    expect(getTableConfig(adminUserRoles).name).toBe("admin_user_roles");
    expect(getTableConfig(rolePermissions).name).toBe("role_permissions");
  });

  it("uses composite primary keys for join tables", () => {
    expect(getTableConfig(adminUserRoles).primaryKeys).toHaveLength(1);
    expect(getTableConfig(rolePermissions).primaryKeys).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
pnpm test src/db/schema/identity.test.ts
```

Expected: FAIL because `./identity` does not exist.

- [ ] **Step 3: Implement minimal schema**

Create `src/db/schema/identity.ts`:

```ts
import {
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const customerStatus = pgEnum("customer_status", [
  "active",
  "suspended",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  emailSnapshot: text("email_snapshot"),
  discordUserId: text("discord_user_id").unique(),
  discordUsername: text("discord_username"),
  discordAvatarUrl: text("discord_avatar_url"),
  customerStatus: customerStatus("customer_status")
    .default("active")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const adminPermissions = pgTable("admin_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
});

export const adminUserRoles = pgTable(
  "admin_user_roles",
  {
    userId: uuid("user_id")
      .notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => adminRoles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => adminRoles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => adminPermissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ],
);
```

Create `src/db/schema/index.ts`:

```ts
export * from "./identity";
```

Auth foreign keys are intentionally absent from the Drizzle declaration.
They are managed as reviewed SQL in Task 5 so Drizzle Kit never treats
`auth.users` as an owned table.

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

```bash
pnpm test src/db/schema/identity.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Review schema boundary**

Run:

```bash
rg -n "pgTable\\(\"users\"|auth\\.table\\(\"users\"" src/db
```

Expected: zero matches. Auth references appear only in reviewed migration SQL.

---

### Task 3: Transaction-Pooler-Compatible Runtime Client

**Files:**

- Create: `src/db/client-options.test.ts`
- Create: `src/db/client-options.ts`
- Create: `src/db/client.ts`

**Interfaces:**

- Produces:
  - `databaseClientOptions`
  - `db`
- Consumes:
  - `parseDatabaseRuntimeEnvironment(process.env)`
  - schema exports from `src/db/schema/index.ts`

- [ ] **Step 1: Write failing client options test**

Create `src/db/client-options.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { databaseClientOptions } from "./client-options";

describe("databaseClientOptions", () => {
  it("disables prepared statements for Transaction Pooler mode", () => {
    expect(databaseClientOptions.prepare).toBe(false);
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
pnpm test src/db/client-options.test.ts
```

Expected: FAIL because `./client-options` does not exist.

- [ ] **Step 3: Add minimal tested options**

Create `src/db/client-options.ts`:

```ts
export const databaseClientOptions = {
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 20,
  max: 10,
} as const;
```

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

```bash
pnpm test src/db/client-options.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 5: Create server-only Drizzle client**

Create `src/db/client.ts`:

```ts
import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { parseDatabaseRuntimeEnvironment } from "@/lib/env/database";

import { databaseClientOptions } from "./client-options";
import * as schema from "./schema";

const { DATABASE_URL } = parseDatabaseRuntimeEnvironment(process.env);
const queryClient = postgres(DATABASE_URL, databaseClientOptions);

export const db = drizzle(queryClient, { schema });
```

No page imports this client during this task, so production build remains
credential-independent.

- [ ] **Step 6: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS without `DATABASE_URL` because typecheck does not execute module
initializers.

---

### Task 4: Permission Seed Contract

**Files:**

- Create: `src/db/seeds/admin-permissions.test.ts`
- Create: `src/db/seeds/admin-permissions.ts`
- Create: `src/db/seeds/run-admin-permissions.ts`
- Modify: `package.json`

**Interfaces:**

- Produces:
  - `adminPermissionSeedRows`
- Consumes:
  - `ADMIN_PERMISSIONS`
  - `AdminPermission`
  - `db`
  - `adminPermissions`

- [ ] **Step 1: Write failing exhaustive seed test**

Create `src/db/seeds/admin-permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { adminPermissionSeedRows } from "./admin-permissions";

describe("adminPermissionSeedRows", () => {
  it("contains every domain permission exactly once", () => {
    expect(adminPermissionSeedRows.map(({ code }) => code).sort()).toEqual(
      Object.values(ADMIN_PERMISSIONS).sort(),
    );
    expect(new Set(adminPermissionSeedRows.map(({ code }) => code)).size).toBe(
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
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
pnpm test src/db/seeds/admin-permissions.test.ts
```

Expected: FAIL because `./admin-permissions` does not exist.

- [ ] **Step 3: Build seed rows from typed domain codes**

Create `src/db/seeds/admin-permissions.ts`:

```ts
import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/modules/identity/domain/permissions";

const descriptions = {
  [ADMIN_PERMISSIONS.writeProduct]: "Create and update catalog products.",
  [ADMIN_PERMISSIONS.publishVersion]: "Publish product versions.",
  [ADMIN_PERMISSIONS.readOrders]: "Read customer orders.",
  [ADMIN_PERMISSIONS.refundPayment]: "Refund successful payments.",
  [ADMIN_PERMISSIONS.grantEntitlement]: "Grant customer entitlements.",
  [ADMIN_PERMISSIONS.manageAdminRoles]: "Manage Admin role assignments.",
} satisfies Record<AdminPermission, string>;

export const adminPermissionSeedRows = Object.values(ADMIN_PERMISSIONS).map(
  (code) => ({
    code,
    description: descriptions[code],
  }),
);
```

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

```bash
pnpm test src/db/seeds/admin-permissions.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Add explicit seed entry point**

Create `src/db/seeds/run-admin-permissions.ts`:

```ts
import { db } from "@/db/client";
import { adminPermissions } from "@/db/schema";

import { adminPermissionSeedRows } from "./admin-permissions";

await db
  .insert(adminPermissions)
  .values(adminPermissionSeedRows)
  .onConflictDoNothing({ target: adminPermissions.code });
```

Add script to `package.json`:

```json
"db:seed:permissions": "tsx src/db/seeds/run-admin-permissions.ts"
```

Do not execute this script in this scope.

---

### Task 5: Offline Migration Generation and Safety Test

**Files:**

- Create: `drizzle.config.ts`
- Modify: `package.json`
- Create: `src/db/migrations/0000_initial_identity.sql`
- Create: `src/db/migrations/meta/*`
- Create: `src/db/migrations/initial-identity.test.ts`

**Interfaces:**

- Consumes:
  - `src/db/schema/index.ts`
  - optional validated `DATABASE_DIRECT_URL`
- Produces:
  - reviewable initial SQL migration

- [ ] **Step 1: Add Drizzle Kit config**

Create `drizzle.config.ts`:

```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { parseDatabaseMigrationEnvironment } from "./src/lib/env/database";

config({ path: ".env.local" });

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
```

Add scripts:

```json
"db:generate": "drizzle-kit generate --name=initial_identity",
"db:migrate": "drizzle-kit migrate"
```

`db:generate` works offline. `db:migrate` requires
`DATABASE_DIRECT_URL` and remains unauthorized in this scope.

- [ ] **Step 2: Write failing migration safety test**

Create `src/db/migrations/initial-identity.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "src/db/migrations");

function readIdentityMigration() {
  const fileName = readdirSync(migrationsDirectory).find(
    (entry) => entry.endsWith("_initial_identity.sql"),
  );

  if (!fileName) {
    throw new Error("Initial identity migration was not generated.");
  }

  return readFileSync(join(migrationsDirectory, fileName), "utf8");
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
      expect(sql).toContain(`CREATE TABLE \"${table}\"`);
    }
  });

  it("references but never creates or drops auth.users", () => {
    const sql = readIdentityMigration();

    expect(
      sql.match(/REFERENCES \"auth\"\.\"users\"\(\"id\"\)/g),
    ).toHaveLength(2);
    expect(sql).not.toMatch(/CREATE TABLE\s+\"auth\"\.\"users\"/i);
    expect(sql).not.toMatch(/DROP TABLE\s+\"auth\"\.\"users\"/i);
  });

  it("does not create a public users table", () => {
    expect(readIdentityMigration()).not.toMatch(
      /CREATE TABLE\s+(?:\"public\"\.)?\"users\"/i,
    );
  });
});
```

- [ ] **Step 3: Run test and verify RED**

Run:

```bash
pnpm test src/db/migrations/initial-identity.test.ts
```

Expected: FAIL with `Initial identity migration was not generated.`

- [ ] **Step 4: Generate migration offline**

Run:

```bash
pnpm db:generate
```

Expected: Drizzle creates one initial SQL file and migration metadata without
connecting to Supabase.

- [ ] **Step 5: Add reviewed Auth foreign keys**

Inspect:

```bash
rg -n "CREATE SCHEMA|CREATE TABLE|ALTER TABLE|DROP TABLE|auth.*users" src/db/migrations
```

Generated SQL must contain no `auth` schema DDL. Append exactly:

```sql
ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_id_auth_users_id_fk"
FOREIGN KEY ("id") REFERENCES "auth"."users"("id")
ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_user_roles"
ADD CONSTRAINT "admin_user_roles_user_id_auth_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
ON DELETE cascade ON UPDATE no action;
```

Forbidden:

```sql
CREATE SCHEMA "auth";
CREATE TABLE "auth"."users" (...);
DROP TABLE "auth"."users";
```

Keep `auth.users` absent from Drizzle metadata. These two reviewed constraints
remain migration-managed external references.

- [ ] **Step 6: Run migration safety test and verify GREEN**

Run:

```bash
pnpm test src/db/migrations/initial-identity.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 7: Confirm no live migration occurred**

Run:

```bash
git status --short
```

Expected: local source/migration changes only. Do not run `pnpm db:migrate`.

---

### Task 6: Documentation and Full Verification

**Files:**

- Modify: `README.md`

**Interfaces:**

- Documents package scripts and connection boundaries already implemented.

- [ ] **Step 1: Document DB commands and safety**

Add to `README.md`:

````markdown
## Database development

`DATABASE_URL` is the application runtime URL and must use Supabase Transaction
Pooler mode on port 6543. Runtime prepared statements are disabled.

`DATABASE_DIRECT_URL` is reserved for Drizzle migrations and must use a direct
or Session Pooler connection on port 5432.

Generate and review SQL without applying it:

```bash
pnpm db:generate
```

Applying migrations or seeding permissions changes the configured database and
requires explicit authorization:

```bash
pnpm db:migrate
pnpm db:seed:permissions
```
````

- [ ] **Step 2: Check dependency peers**

Run:

```bash
pnpm peers check
```

Expected: `No peer dependency issues found`.

- [ ] **Step 3: Run full project gate**

Run:

```bash
pnpm check
```

Expected:

- ESLint PASS with zero warnings
- TypeScript PASS
- All Vitest files PASS
- Next.js production build PASS

- [ ] **Step 4: Scan for secrets and unsafe schema ownership**

Run:

```bash
rg -n "gcadirxgzymetezbwoza|aws-0-ap-northeast-1|\\[YOUR-PASSWORD\\]|postgresql://postgres\\." --glob '!pnpm-lock.yaml' .
rg -n "CREATE TABLE\\s+\"auth\"\\.\"users\"|DROP TABLE\\s+\"auth\"\\.\"users\"" src/db/migrations
```

Expected: no matches in committed project files or migration SQL.

- [ ] **Step 5: Final diff review**

Run:

```bash
git diff --check
git status --short
```

Review every changed path. Preserve unrelated user changes. Do not stage,
commit, connect, migrate, seed, push, or deploy.
