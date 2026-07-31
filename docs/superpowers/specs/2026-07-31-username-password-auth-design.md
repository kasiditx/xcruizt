# Username and Password Authentication Design

## Goal

Customers can create an XCRUIZT account with a username and password, receive
an authenticated session immediately, and use the same login page as future
administrators. Discord remains an optional sign-in method.

## Confirmed behavior

- Username is the only public identifier required for password signup.
- Successful signup redirects directly to the requested safe account path.
- Passwords are owned, hashed, and verified by Supabase Auth. XCRUIZT never
  stores plaintext passwords or password hashes.
- Usernames are case-insensitive. Input is trimmed and normalized to lowercase.
- Login failures use one generic response so the UI does not reveal whether a
  username exists.
- Roles and permissions remain database-backed. Username and Supabase
  `user_metadata` never grant Admin access.
- Discord users without an XCRUIZT username must choose one before entering the
  account area.

## Approaches considered

### 1. Supabase email/password with an internal username adapter — selected

Derive a deterministic, non-deliverable internal email from the normalized
username and use Supabase email/password Auth. Store the public username in
`profiles`.

Benefits: Supabase owns password security and sessions; no second password
system; existing SSR and PKCE integration remains valid.

Trade-off: email-based password reset is unavailable until a real email-linking
flow is added. Account recovery must initially use Discord or an audited Admin
workflow.

### 2. Collect email but display only username

This keeps native email recovery but violates the explicit username-only signup
requirement.

### 3. Custom password table

Rejected. It duplicates password hashing, breach response, session security,
and credential lifecycle logic already provided by Supabase.

## Architecture

`username-credentials.ts` is a provider-independent application boundary. It
validates and normalizes credentials and derives the internal Auth identifier.
Next.js Server Actions call Supabase Auth, then invoke a server-only profile
repository to idempotently create or update the matching `profiles` record.

The public profile schema gains `username text not null unique`. Existing RLS
continues to allow an authenticated user to select only their own profile.
Server-side code uses the database connection for profile bootstrap; the
browser never supplies a trusted user ID.

## Data flow

### Password signup

1. Server Action validates username and password.
2. Server derives the internal Supabase Auth email.
3. `supabase.auth.signUp` creates the Auth user.
4. Signup must return both a verified user and a session.
5. Server idempotently creates the profile using the Auth user ID.
6. Browser redirects to the sanitized `next` path.

If Supabase still requires email confirmation, the action fails closed with a
configuration message and does not claim that signup completed.

### Password login

1. Server validates and normalizes credentials.
2. Server calls `signInWithPassword` using the derived identifier.
3. Server ensures the profile exists for recovery from a prior partial signup.
4. Browser redirects to the sanitized `next` path.

### Discord

Discord continues through PKCE. After code exchange, the callback checks for a
profile with a username. Missing usernames redirect to a protected profile
completion route instead of the account area.

## Validation and errors

- Username: 3–24 characters, ASCII lowercase letters, digits, and underscore.
- Reserved names such as `admin`, `administrator`, `support`, `system`,
  `xcruizt`, and `root` are rejected.
- Password: 8–72 characters.
- Signup conflict and login failure return generic Thai messages.
- Provider and database details are never returned to the client or logged with
  credentials.

## Security and reliability

- Supabase session cookie remains HTTP-only through the existing SSR client.
- Internal Auth identifiers are never rendered as customer email addresses.
- Profile creation uses an upsert keyed by authenticated Auth user ID and a
  unique username constraint.
- Username conflict is protected by validation plus the database constraint.
- Admin authorization remains independent and server-enforced.
- Production signup still needs abuse controls such as Turnstile or a bounded
  rate limiter before public launch.

## Verification

- Unit tests cover normalization, invalid usernames, reserved names, internal
  identifier derivation, and password boundaries.
- Schema and migration tests cover non-null unique usernames.
- Server Action orchestration is kept thin; live Supabase signup/login is tested
  with a temporary account only after Auth autoconfirm is enabled.
- Full gates: `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

