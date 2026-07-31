# Complete Commerce Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add all 26 XCRUIZT database tables defined in the commerce blueprint, migrate the reviewed schema to Supabase, and verify its live security and integrity.

**Architecture:** Keep Identity/Admin tables in the existing schema module and add focused Drizzle modules for Catalog, Commerce, Fulfillment, and Operations. Cross-domain foreign keys preserve financial and audit history, every public table has RLS enabled, customer-readable records use owner-scoped policies, and sensitive operational tables remain server-only.

**Tech Stack:** PostgreSQL on Supabase, Drizzle ORM 0.45.2, drizzle-kit 0.31.10, TypeScript 5.9, Vitest 4.

## Global Constraints

- The blueprint at `/Users/kasidit/Downloads/XCRUIZT_ReShade_Commerce_Blueprint.md` is the source of truth for table and column names.
- Keep the existing `profiles.username` extension required by username/password authentication.
- Use UUID primary keys, `timestamptz`, JSONB, integer satang values, and blueprint enums.
- Index every foreign-key access path not already covered by a primary key or unique index.
- Enable RLS on every table in the exposed `public` schema.
- Do not expose payments, files, webhook payloads, outbox jobs, Discord jobs, or audit logs through permissive client policies.
- Do not hardcode or print database credentials.
- Do not commit or push without explicit user authorization.

---

### Task 1: Lock the Blueprint Schema Contract

**Files:**
- Create: `src/db/schema/commerce.test.ts`
- Create: `src/db/schema/schema-test-helpers.ts`

**Interfaces:**
- Consumes: exports from `src/db/schema/index.ts`
- Produces: executable assertions for all 26 table names, required columns, enum values, foreign-key indexes, checks, unique constraints, and RLS

- [x] **Step 1: Write a failing inventory test**

  Import the schema namespace and assert that all 20 missing Blueprint tables are exported. Use literal table and column lists derived independently from the Blueprint.

- [x] **Step 2: Run the schema test and verify RED**

  Run: `pnpm test src/db/schema/commerce.test.ts`

  Expected: FAIL because the new schema exports do not exist.

### Task 2: Implement Catalog Schema

**Files:**
- Create: `src/db/schema/catalog.ts`
- Modify: `src/db/schema/index.ts`
- Test: `src/db/schema/commerce.test.ts`

**Interfaces:**
- Produces: `collections`, `products`, `skus`, `skuProducts`, `productVersions`, `files`, and `productImages`
- Consumes: `profiles.id` for `product_versions.created_by`

- [x] **Step 1: Add Blueprint enums and tables**

  Add exact Blueprint columns, defaults, unique constraints, relationship foreign keys, non-negative numeric checks, and RLS.

- [x] **Step 2: Add integrity indexes**

  Add collection/product/version/media lookup indexes, one-current-version protection, and foreign-key indexes.

- [x] **Step 3: Run the focused test and verify GREEN for Catalog**

  Run: `pnpm test src/db/schema/commerce.test.ts`

### Task 3: Implement Commerce and Fulfillment Schema

**Files:**
- Create: `src/db/schema/commerce.ts`
- Create: `src/db/schema/fulfillment.ts`
- Modify: `src/db/schema/index.ts`
- Test: `src/db/schema/commerce.test.ts`

**Interfaces:**
- Produces: `orders`, `orderItems`, `payments`, `refunds`, `coupons`, `couponRedemptions`, `entitlements`, and `downloadEvents`
- Consumes: Identity profile IDs and Catalog product/SKU/file IDs

- [x] **Step 1: Add order, coupon, payment, and refund tables**

  Preserve immutable snapshots, validate positive quantities and non-negative satang values, enforce provider identifier uniqueness, and index all ownership/payment lookup paths.

- [x] **Step 2: Add entitlement and download tables**

  Enforce unique active ownership with a partial unique index and retain append-only download evidence.

- [x] **Step 3: Add customer owner-read policies**

  Allow authenticated users to select only their own orders, order items, and entitlements. Keep payments and download audit data server-only.

- [x] **Step 4: Run the focused test and verify GREEN for Commerce**

  Run: `pnpm test src/db/schema/commerce.test.ts`

### Task 4: Implement Operational and Community Schema

**Files:**
- Create: `src/db/schema/operations.ts`
- Modify: `src/db/schema/index.ts`
- Test: `src/db/schema/commerce.test.ts`

**Interfaces:**
- Produces: `webhookEvents`, `outboxEvents`, `discordRoleMappings`, `discordSyncJobs`, and `reviews`
- Consumes: Identity, Catalog, and Commerce identifiers

- [x] **Step 1: Add idempotent webhook and outbox tables**

  Enforce `(provider, provider_event_id)` uniqueness, non-negative attempt counts, dispatch indexes, and server-only RLS.

- [x] **Step 2: Add Discord mapping/job and review tables**

  Validate mapping ownership, index pending jobs, enforce review rating 1–5 and one review per user/product, and permit public reads only for published reviews.

- [x] **Step 3: Run schema tests**

  Run: `pnpm test src/db/schema/commerce.test.ts src/db/schema/identity.test.ts`

  Expected: PASS.

### Task 5: Generate, Review, and Test the Migration

**Files:**
- Create: `src/db/migrations/0004_complete_commerce_schema.sql`
- Create: `src/db/migrations/complete-commerce.test.ts`
- Modify: `src/db/migrations/meta/_journal.json`
- Create: `src/db/migrations/meta/0004_snapshot.json`

**Interfaces:**
- Consumes: complete Drizzle schema exports
- Produces: one ordered migration for the 20 missing tables and their database protections

- [x] **Step 1: Generate the migration**

  Run: `pnpm db:generate --name=complete_commerce_schema`

- [x] **Step 2: Review generated SQL**

  Verify table ordering, foreign keys, enum names, checks, partial unique indexes, RLS, and policies. Confirm there is no operation against `auth.users` beyond existing foreign keys.

- [x] **Step 3: Write and run migration behavior tests**

  Run: `pnpm test src/db/migrations/complete-commerce.test.ts`

  Expected: PASS only when all 20 tables, RLS statements, critical uniqueness rules, and customer policies exist.

### Task 6: Apply and Verify Supabase

**Files:**
- Modify: `README.md`
- Modify: `CONTEXT.MD` (ignored project context)

**Interfaces:**
- Consumes: `DATABASE_DIRECT_URL` from `.env.local`
- Produces: live Supabase schema matching all 26 Blueprint tables

- [x] **Step 1: Run migration preflight**

  Query live migration history and table inventory without printing credentials.

- [x] **Step 2: Apply the migration**

  Run: `pnpm db:migrate`

- [x] **Step 3: Verify live database state**

  Query `information_schema`, `pg_class`, `pg_constraint`, `pg_indexes`, and `pg_policies` to verify all tables, RLS, foreign keys, unique constraints, checks, and required indexes.

- [x] **Step 4: Verify client isolation**

  Confirm anonymous access cannot read sensitive tables and authenticated owner policies cannot read another user's records.

- [x] **Step 5: Run the full project gate**

  Run: `pnpm check`

  Expected: lint, typecheck, all tests, and production build exit successfully.

- [x] **Step 6: Document the final schema**

  Update the project documentation with all 26 tables, migration command, security posture, and live verification evidence.
