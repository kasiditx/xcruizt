# XCRUIZT README Design

## Goal

Replace the minimal README with an accurate contributor-facing guide for the
current XCRUIZT foundation. Use Thai for explanations while retaining standard
English technical terms, commands, filenames, and product concepts.

## Audience

- Developers setting up the repository locally
- Reviewers checking current implementation scope
- Future contributors working through the delivery phases

The README is not a marketing landing page or complete architecture
specification.

## Content Structure

1. **Project summary**
   - Identify XCRUIZT as a custom commerce platform for FiveM ReShade presets.
   - State the customer journey at a high level without claiming unimplemented
     integrations work.
2. **Current status**
   - Separate implemented foundation capabilities from planned integrations.
   - Implemented: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4,
     landing/login foundation, typed core environment validation, Admin
     permission policy, Vitest tests, lint/typecheck/build scripts.
   - Planned or not connected: Supabase Auth and PostgreSQL, Drizzle, Stripe
     PromptPay, R2 downloads, Admin operations, notifications, Discord, jobs,
     production observability.
3. **Core principles**
   - Server-authoritative pricing, payment, authorization, entitlement, and
     download decisions.
   - Verified Stripe webhook as payment truth.
   - Database-backed Admin permissions.
   - Private files and short-lived signed downloads.
4. **Tech stack**
   - Distinguish installed foundation dependencies from planned integrations.
5. **Repository structure**
   - Show only paths that currently exist and explain their responsibility.
6. **Local development**
   - Requirements: Node.js `>=20.9.0`, pnpm `11.9.0`.
   - Commands: copy `.env.example`, install, run dev, open localhost.
7. **Environment**
   - Explain current validated core variables.
   - Explain provider variables are placeholders until integrations land.
   - Warn against committing secrets.
8. **Scripts**
   - Document every current `package.json` script exactly.
9. **Testing and verification**
   - Recommend `pnpm check` for the full local gate.
   - Explain individual lint, typecheck, test, and build commands.
10. **Delivery roadmap**
    - Summarize phases without presenting future work as implemented.

## Link Policy

Do not link to `AGENTS.md`, `CONTEXT.MD`, or files under `docs/`. Those paths are
local-only and ignored by Git, so links would be broken for repository readers.

Do not add badges, screenshots, license claims, deployment URLs, contributor
policies, provider setup instructions, or production guarantees without
repository evidence.

## Style

- Thai-first, concise, technical.
- Keep English names for frameworks, commands, domain entities, and paths.
- Use short sections, compact tables, and fenced command blocks.
- Avoid promotional claims and generic filler.
- Explicitly label planned or unavailable capabilities.

## Verification

1. Compare every version, script, and dependency claim with `package.json`.
2. Compare every current-source claim with files under `src/`.
3. Confirm all referenced paths exist and ignored local files are not linked.
4. Confirm setup commands use pnpm and `.env.local`.
5. Run `git diff --check -- README.md`.
6. Scan README for unsupported claims about connected providers or production
   readiness.

