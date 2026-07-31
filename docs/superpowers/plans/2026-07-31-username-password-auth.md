# Username and Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:test-driven-development and execute each task inline. Subagents
> and commits are intentionally omitted because the current user requested
> direct execution in the existing workspace and did not authorize commits.

**Goal:** Add immediate XCRUIZT signup and login with username/password while
Supabase remains the credential and session authority.

**Architecture:** A pure application module validates and maps usernames to
internal Supabase identifiers. Thin Server Actions call Supabase Auth, then a
server-only repository idempotently bootstraps `profiles`. Account routes
verify the Supabase user on the server.

**Tech Stack:** Next.js 16 App Router, React 19 Server Actions, TypeScript,
Zod 4, Supabase Auth SSR, Drizzle ORM, PostgreSQL, Vitest.

## Global Constraints

- Username signup requires no email and must produce a session immediately.
- Never store or log plaintext passwords, password hashes, tokens, or secrets.
- Username and metadata never grant Admin permissions.
- Preserve the existing premium dark-first XCRUIZT UI.
- Keep Server Actions thin and validate every form boundary.
- Apply no external mutation until the required setting and exact target are
  confirmed.

---

### Task 1: Username credential contract

**Files:**
- Create: `src/modules/identity/application/username-credentials.test.ts`
- Create: `src/modules/identity/application/username-credentials.ts`

**Interfaces:**
- Produces:
  - `parseUsernameCredentials(input): { username: string; password: string }`
  - `toInternalAuthEmail(username: string): string`

- [ ] Write tests proving lowercase normalization, allowed characters, length
  boundaries, reserved-name rejection, password boundaries, and deterministic
  internal identifier derivation.
- [ ] Run `pnpm test src/modules/identity/application/username-credentials.test.ts`
  and confirm failure because the production module does not exist.
- [ ] Implement the minimum Zod-backed parser and identifier mapper.
- [ ] Re-run the focused test and confirm all cases pass.

### Task 2: Profile username migration

**Files:**
- Modify: `src/db/schema/identity.ts`
- Modify: `src/db/schema/identity.test.ts`
- Create: generated `src/db/migrations/0002_*.sql`
- Modify: generated migration metadata

**Interfaces:**
- Produces: `profiles.username`, non-null and unique.

- [ ] Add a failing schema assertion for the `username` column and unique
  constraint.
- [ ] Run `pnpm test src/db/schema/identity.test.ts` and confirm the expected
  failure.
- [ ] Add `username` to the Drizzle schema.
- [ ] Generate the migration with `pnpm db:generate --name=username_credentials`.
- [ ] Review generated SQL and run focused schema/migration tests.
- [ ] Confirm the live `profiles` table is empty, apply `pnpm db:migrate`, then
  verify the column and constraint from PostgreSQL metadata.

### Task 3: Auth use case and profile bootstrap

**Files:**
- Create: `src/modules/identity/application/password-auth.test.ts`
- Create: `src/modules/identity/application/password-auth.ts`
- Create: `src/modules/identity/infrastructure/profile-repository.ts`
- Modify: `src/app/auth/login/actions.ts`

**Interfaces:**
- Consumes: normalized credentials and safe redirect resolver.
- Produces:
  - `signUpWithPassword(previousState, formData)`
  - `signInWithPassword(previousState, formData)`
  - `ensureProfile({ userId, username })`

- [ ] Write failing tests for successful signup, missing immediate session,
  generic provider errors, safe redirect output, and idempotent profile
  bootstrap orchestration.
- [ ] Run the focused tests and confirm failures for missing behavior.
- [ ] Implement dependency-injected application orchestration.
- [ ] Implement the Drizzle profile upsert and thin Server Action adapters.
- [ ] Re-run focused tests.

### Task 4: Login and signup UI

**Files:**
- Delete: `src/app/auth/login/magic-link-form.tsx`
- Create: `src/app/auth/login/password-auth-form.tsx`
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes the two password Server Actions and existing Discord action.
- Produces an accessible login/signup switch on one route.

- [ ] Build a leaf Client Component with `useActionState`, explicit labels,
  password autocomplete values, pending states, and live error announcements.
- [ ] Replace Magic Link copy with Username/Password copy.
- [ ] Preserve Discord button and safe `next` value.
- [ ] Add only CSS required for the mode switch and helper copy.

### Task 5: Protected account entry

**Files:**
- Create: `src/modules/identity/infrastructure/current-user.ts`
- Create: `src/app/account/library/page.tsx`
- Create: `src/app/account/library/loading.tsx`
- Create: `src/app/account/library/error.tsx`

**Interfaces:**
- Produces `requireCurrentUser()` based on verified Supabase claims/user data.

- [ ] Add a server-only current-user guard that redirects anonymous users to
  `/auth/login?next=/account/library`.
- [ ] Add a minimal Library empty state that displays the public username, not
  the internal Auth email.
- [ ] Add loading and safe error boundaries.

### Task 6: Provider setting and live flow

**Files:**
- No source files unless a discovered provider contract requires a documented
  environment change.

- [ ] Confirm exact Supabase project before mutation.
- [ ] Disable email confirmation so password signup returns a session
  immediately.
- [ ] Do not enable Discord until client ID and secret exist.
- [ ] Create a temporary test username through the real website/API, verify an
  immediate session, sign out, sign in again, and remove the temporary Auth and
  profile records if a safe cleanup path is available.

### Task 7: Documentation and full verification

**Files:**
- Modify: `CONTEXT.MD`
- Modify: `README.md`

- [ ] Update current-state docs from Magic Link to Username/Password and record
  the exact Discord configuration blocker.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Inspect `git diff` and scan tracked/source files for leaked credentials.

