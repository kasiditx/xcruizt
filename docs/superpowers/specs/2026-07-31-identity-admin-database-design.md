# XCRUIZT Identity and Admin Database Design

Date: 31 July 2026  
Status: Draft for user review

## Goal

Create the first PostgreSQL and Drizzle foundation for XCRUIZT identity and
Admin authorization without connecting to, migrating, or mutating the live
Supabase project.

This scope establishes:

- A typed Drizzle connection for the Next.js server runtime
- A separate migration connection
- Customer profiles linked to Supabase Auth identities
- Database-backed Admin roles and action-level permissions
- An initial Drizzle migration that can be reviewed before execution

This scope does not implement Supabase login UI, session cookies, Admin pages,
RLS policies, catalog tables, Stripe, or production data changes.

## Approaches Considered

### A. Drizzle with separate runtime and migration connections

Use Supabase Transaction Pooler on port `6543` for application runtime with
postgres-js prepared statements disabled. Use a direct connection on port
`5432` for Drizzle migrations. If the developer network cannot reach the
IPv6-only direct endpoint, use Supavisor Session Pooler on port `5432` for
migrations.

Advantages:

- Matches Vercel/serverless connection behavior
- Keeps migration work away from transaction pooling limitations
- Preserves Drizzle as the database abstraction selected by the blueprint

Cost:

- Requires two environment variables

Decision: selected.

### B. Transaction Pooler for runtime and migrations

Use one `DATABASE_URL` for all database activity.

Advantages:

- Fewer environment variables

Risks:

- Migration tooling may encounter transaction-pooling limitations
- Runtime and operational workloads cannot be configured independently

Decision: rejected.

### C. Supabase Data API for runtime and Drizzle for migrations

Use `supabase-js` for application queries while keeping Drizzle only for schema
and migration management.

Advantages:

- Natural integration with Supabase RLS

Risks:

- Introduces two data-access patterns before there is evidence both are needed
- Weakens the planned repository boundary and increases maintenance cost

Decision: deferred. Supabase Auth clients can still be added later without
using the Data API as the primary repository implementation.

## Connection Design

### Runtime

Environment variable:

```text
DATABASE_URL
```

Expected connection:

```text
Supabase Shared Transaction Pooler
Host: aws-0-ap-northeast-1.pooler.supabase.com
Port: 6543
Database: postgres
```

postgres-js configuration:

```text
prepare: false
```

The connection string remains server-only. It must never use a
`NEXT_PUBLIC_` prefix, appear in client bundles, logs, screenshots, or committed
files.

### Migrations

Environment variable:

```text
DATABASE_DIRECT_URL
```

Preferred connection:

```text
Supabase direct database endpoint on port 5432
```

Fallback when the local network cannot reach the IPv6 direct endpoint:

```text
Supabase Shared Session Pooler on port 5432
```

`drizzle-kit` uses `DATABASE_DIRECT_URL`. It must not silently fall back to the
runtime Transaction Pooler because that would hide a deployment configuration
error.

### Local configuration

Real values belong in `.env.local`, which is ignored by Git. `.env.example`
contains names and safe placeholders only.

No application code should parse or reconstruct a connection URI from separate
credentials. Supabase supplies the canonical URI.

## Schema Design

### Supabase Auth ownership

Supabase owns `auth.users`. XCRUIZT must not create, alter, or replace that
table through Drizzle migrations.

`public.profiles.id` uses the same UUID as `auth.users.id`. The migration adds a
foreign key with `ON DELETE CASCADE` so removal of an Auth identity cannot leave
an orphaned profile.

### `customer_status`

PostgreSQL enum:

```text
active
suspended
```

Default: `active`

Suspension is an application authorization input. It does not delete order,
payment, entitlement, download, or audit history.

### `profiles`

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | Primary key, FK to `auth.users.id` |
| `display_name` | `text` | Nullable |
| `avatar_url` | `text` | Nullable |
| `email_snapshot` | `text` | Nullable |
| `discord_user_id` | `text` | Nullable, unique |
| `discord_username` | `text` | Nullable |
| `discord_avatar_url` | `text` | Nullable |
| `customer_status` | `customer_status` | Not null, default `active` |
| `created_at` | `timestamptz` | Not null, default `now()` |
| `updated_at` | `timestamptz` | Not null, default `now()` |

`email_snapshot` is display/support context only. Supabase Auth remains the
current authentication-email source.

### `admin_roles`

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | Primary key, generated UUID |
| `name` | `text` | Not null, unique |
| `description` | `text` | Not null |
| `created_at` | `timestamptz` | Not null, default `now()` |

### `admin_permissions`

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | Primary key, generated UUID |
| `code` | `text` | Not null, unique |
| `description` | `text` | Not null |

Initial permission codes:

```text
catalog.product.write
catalog.version.publish
orders.read
payments.refund
entitlements.grant
admin.roles.manage
```

These values must share one typed source with the existing
`ADMIN_PERMISSIONS` domain constant. Seed code must consume that source instead
of maintaining a second handwritten list.

### `admin_user_roles`

| Column | Type | Constraint |
|---|---|---|
| `user_id` | `uuid` | FK to `auth.users.id`, cascade on delete |
| `role_id` | `uuid` | FK to `admin_roles.id`, cascade on delete |
| `created_at` | `timestamptz` | Not null, default `now()` |

Primary key: (`user_id`, `role_id`)

### `role_permissions`

| Column | Type | Constraint |
|---|---|---|
| `role_id` | `uuid` | FK to `admin_roles.id`, cascade on delete |
| `permission_id` | `uuid` | FK to `admin_permissions.id`, cascade on delete |

Primary key: (`role_id`, `permission_id`)

## Module Boundaries

```text
drizzle.config.ts
  Loads migration-only environment and points Drizzle Kit to schema/migrations.

src/db/client.ts
  Creates server-only postgres-js and Drizzle runtime clients.

src/db/schema/identity.ts
  Declares public Identity/Admin tables and enums.

src/db/schema/index.ts
  Exports schema entities consumed by Drizzle.

src/db/migrations/
  Contains generated SQL and Drizzle migration metadata.

src/lib/env/
  Validates runtime and migration database URLs without logging their values.

src/modules/identity/domain/permissions.ts
  Owns typed permission codes shared by authorization and seed logic.
```

No React component, Client Component, or browser bundle may import
`src/db/client.ts`.

## Migration Safety

- Generate migration locally; do not execute it against Supabase in this scope.
- Review generated SQL for operations outside `public` schema.
- The only allowed reference into `auth` is a foreign key to `auth.users(id)`.
- Never create or drop `auth.users`.
- Use UUID columns, explicit constraints, and explicit timestamps.
- No destructive migration or table rewrite.
- Migration execution requires a populated `.env.local` and separate explicit
  user authorization.

## Error Handling

- Missing `DATABASE_URL` fails with a configuration error before a runtime query.
- Missing `DATABASE_DIRECT_URL` fails before Drizzle Kit can run a migration.
- Error messages identify the missing variable but never include its value.
- Database connection and SQL errors must remain server-side.
- Connection URIs must not be logged.

## Testing

TDD order:

1. Environment tests fail until database URLs are accepted and required by the
   correct boundary.
2. Schema contract tests fail until required tables, columns, keys, and enum
   values exist.
3. Runtime client option test fails until Transaction Pooler compatibility sets
   `prepare: false`.
4. Generate migration and inspect SQL using automated assertions:
   - creates only planned public tables and enum
   - references `auth.users`
   - does not create or drop `auth.users`
5. Existing lint, typecheck, unit tests, peer checks, and production build pass.

No live integration test or migration-success claim is allowed until real
credentials are configured and migration execution is explicitly authorized.

## Acceptance Criteria

- Required packages use pnpm and appear in the lockfile.
- Runtime and migration connections use separate validated environment
  variables.
- Schema matches this document and the approved blueprint.
- Sample `public.users` table is absent.
- Permission codes have one typed source.
- Generated migration is present and reviewed but not executed.
- Tests prove environment, schema, and transaction-pooler behavior.
- `pnpm peers check` and `pnpm check` pass.
- No secret or complete connection URI is committed.
