# Auth-Aware Navigation, Admin, and Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the authenticated session visible across public/account pages, protect an Admin dashboard with database permissions, and render the customer's real active entitlements in Library.

**Architecture:** Resolve the authenticated Supabase user from validated server claims, then load roles and permissions from PostgreSQL rather than client metadata. Reuse that server viewer context in navigation, Login redirect, and Admin authorization; keep entitlement data access in a dedicated server-only repository scoped by the validated user ID.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, Supabase SSR Auth, Drizzle ORM, PostgreSQL, Vitest, Tailwind CSS v4/custom design tokens.

## Global Constraints

- Never use Supabase `user_metadata` as an Admin authorization source.
- Normal customers must not see Admin navigation and must be denied by the Admin route on the server.
- Do not expose payments, storage keys, webhook payloads, or internal errors in UI.
- Do not create fake Products, Orders, or Entitlements.
- Preserve the existing XCRUIZT dark visual language and mobile behavior.
- Do not commit or push without explicit user authorization.

---

### Task 1: Current Viewer and Admin Authorization

**Files:**
- Modify: `src/modules/identity/application/current-account.ts`
- Modify: `src/modules/identity/application/current-account.test.ts`
- Modify: `src/modules/identity/infrastructure/current-account.ts`

**Interfaces:**
- Consumes: `getCurrentAccountResolution()`, `admin_user_roles`, `admin_roles`, `role_permissions`, and `admin_permissions`
- Produces: `getCurrentAccountResolution()` with authenticated account, role names, typed permission codes, and `isAdmin`

- [x] Write tests proving anonymous users stay anonymous, customers receive no Admin access, and database permissions make an authenticated user an Admin.
- [x] Run the focused test and verify RED because Admin authorization was absent.
- [x] Extend the pure resolver and server-only Drizzle account adapter.
- [x] Re-run the focused test and verify GREEN.

### Task 2: Session-Aware Home and Login

**Files:**
- Create: `src/components/account/account-controls.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `getCurrentAccountResolution()` and existing `signOut`
- Produces: Home account controls that show Sign in only for anonymous users, Library/username for authenticated users, and Admin only for authorized users

- [x] Write a failing application test for Login routing decisions: anonymous renders Login, profile-incomplete redirects to profile completion, and ready accounts redirect to the safe `next` path.
- [x] Implement the pure Login routing decision and verify the test passes.
- [x] Add the shared accessible account controls and use them on Home.
- [x] Add the server-side Login guard before rendering either authentication form.

### Task 3: Protected Admin Dashboard

**Files:**
- Modify: `src/modules/identity/domain/permissions.ts`
- Modify: `src/modules/identity/domain/permissions.test.ts`
- Create: `src/modules/administration/infrastructure/dashboard-repository.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/loading.tsx`
- Create: `src/app/admin/error.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: current viewer permissions and aggregate database counts
- Produces: `/admin` that redirects anonymous users, completes missing profiles, returns not-found for customers, and renders operational counts for Admin users

- [x] Write and run failing permission-policy tests for empty, unknown, and approved Admin permission sets.
- [x] Implement the typed Admin access policy and verify GREEN.
- [x] Add a server-only aggregate dashboard query with no customer PII.
- [x] Render a responsive Admin overview and permission list after server authorization succeeds.

### Task 4: Real Entitlement Library

**Files:**
- Create: `src/modules/entitlements/application/library.ts`
- Create: `src/modules/entitlements/application/library.test.ts`
- Create: `src/modules/entitlements/infrastructure/library-repository.ts`
- Modify: `src/app/account/library/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: validated current account ID and active entitlement/product/version records
- Produces: safe Library cards without storage keys and the existing empty state when no active ownership exists

- [x] Write a failing mapper test proving revoked rows are excluded and customer-safe product/version fields are returned.
- [x] Implement the mapper and scoped Drizzle query, then verify GREEN.
- [x] Render entitlement cards with meaningful empty state and Admin navigation when authorized.

### Task 5: Verification

**Files:**
- Modify: `README.md`
- Modify: `CONTEXT.MD`

**Interfaces:**
- Consumes: completed authenticated navigation, Admin route, and Library
- Produces: browser and automated evidence for the fixed behavior

- [x] Run focused tests, lint, and typecheck.
- [x] Verify signed-in Home shows `@xtiskas`, Library, and Admin without showing Sign in.
- [x] Verify `/auth/login` redirects an existing session to Library.
- [x] Verify `/admin` renders for the Super Admin and remains server-protected.
- [ ] Verify sign out changes Home back to Sign in without exposing Admin.
- [ ] Test 320px, 768px, 1024px, and 1440px layouts plus keyboard navigation.
- [x] Run `pnpm check` and update project status documentation.
