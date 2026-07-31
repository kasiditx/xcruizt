# XCRUIZT Skill Routing Design

## Goal

Make repository agents select the smallest relevant skill set for each request.
Keep `caveman full` active for every response. Do not invoke every listed skill
for every task.

## Instruction Entry Point

Rename the current root `AGENT.MD` to canonical `AGENTS.md`. Preserve all
existing project rules, then add the routing policy below.

## Routing Order

Apply instructions in this order:

1. User request and root `AGENTS.md`
2. Always-on communication rule
3. Process skill selected by task type
4. Domain or implementation skill selected by verified project context
5. Verification and branch-finishing skill when its gate is reached

When two skills conflict, follow the higher-priority instruction and the more
specific task skill. Never weaken security, authorization, data-integrity, or
scope rules to satisfy a presentation or implementation skill.

## Always-On Skills

### `caveman full`

- Active for every response until the user explicitly disables it.
- Keep technical substance, exact errors, commands, risks, and verification
  evidence.
- Temporarily expand wording only when terse language could make a destructive,
  security-sensitive, or multi-step instruction unsafe.

### `superpowers:using-superpowers`

- Check applicable skills before responding or acting.
- Announce selected skills briefly.
- Select only skills whose trigger matches the current task.

## Process Routing

| Request type | Required route |
| --- | --- |
| New feature, component, functionality, behavior, or config change | `superpowers:brainstorming` before implementation; obtain design approval |
| Feature or bug implementation | `superpowers:test-driven-development`; verify RED, GREEN, then refactor |
| Bug, failure, regression, or unexpected behavior | `superpowers:systematic-debugging` before proposing a fix; establish root cause first |
| Received review feedback | `superpowers:receiving-code-review`; verify feedback against repository evidence before implementing |
| Any completion, passing, fixed, commit, or PR claim | `superpowers:verification-before-completion`; run fresh proving commands |
| Implementation complete and full suite green | `superpowers:finishing-a-development-branch`; present its integration choices |

Process skills compose by phase. Example bug route:

```text
systematic-debugging
  -> root cause established
  -> test-driven-development
  -> verification-before-completion
  -> finishing-a-development-branch (only when integration is requested)
```

## Frontend Routing

Use verified repository context before selecting these skills.

| Trigger | Skill route |
| --- | --- |
| React component, hook, state, rendering, Suspense, React tests | `react-expert` |
| Next.js App Router, RSC, Server Action, Route Handler, caching, metadata, deployment | `nextjs-developer` |
| New UI or major visual reshape | `impeccable` plus `frontend-design`; pass Impeccable preflight before edits |
| Production UI implementation | `frontend-ui-engineering` |
| Existing UI audit or plan-only improvement request | `improve-ui`; remain read-only outside `design-plans/` |
| UI polish, surfaces, icons, hover, press, micro-interactions | `better-ui` |
| Forms, dialogs, controls, focus, keyboard, ARIA, contrast | `fixing-accessibility` |
| Animation or motion performance | `fixing-motion-performance` |
| SEO, canonical, Open Graph, icons, manifest, structured data | `fixing-metadata` |
| Repository has `components.json` or request explicitly targets shadcn | `shadcn`; inspect project info and component docs before changes |

Rules:

- `improve-ui` is audit and planning only. Do not combine it with source
  implementation in the same task.
- `impeccable` applies only to frontend design work, not backend-only work.
- `shadcn` is conditional. Current absence of `components.json` means planned
  shadcn architecture alone does not prove an initialized shadcn project.
- Preserve XCRUIZT design tokens, component ownership, dark-first direction,
  accessibility, responsive behavior, and reduced-motion support.

## Data and Analytics Routing

| Trigger | Skill route |
| --- | --- |
| Define KPIs, drivers, guardrails, targets | `data-analytics:design-kpis` |
| Build a dashboard or scorecard | `data-analytics:build-dashboard` |
| Produce WBR, MBR, QBR, KPI status, or executive readout | `data-analytics:kpi-reporting` |
| Explain a metric movement, anomaly, or discrepancy | `data-analytics:metric-diagnostics` |
| Check source completeness, uniqueness, validity, integrity, freshness, or drift | `data-analytics:analyze-data-quality` |
| QA an analysis, calculation, comparison, chart, or conclusion | `data-analytics:validate-data` |
| Select, build, revise, or QA quantitative charts | `data-analytics:visualize-data` |

Data rules:

- Do not fabricate metrics, rows, sources, targets, or dashboard evidence.
- Confirm source, grain, freshness, time window, filters, denominator, and
  timezone before precise claims.
- If required source data is unavailable, stop the source-backed path and state
  the exact access or artifact needed.
- Use `analyze-data-quality` before KPI design or diagnostics when source trust
  can change the answer.
- Use `validate-data` before stakeholder-facing analytical claims.

## GitHub and Branch Routing

Use `github:github` for GitHub repository, issue, and PR context. Route:

- review comments to the review-feedback workflow;
- failing Actions checks to a CI-debugging workflow;
- commit, push, and PR creation only after explicit user authorization;
- branch completion to `superpowers:finishing-a-development-branch`.

Prefer connected GitHub data for PR and issue metadata. Use local `git` or `gh`
for current-branch discovery, branch operations, and Actions logs when needed.

## Non-Applicable Skills

Do not invoke a skill merely because it appears in this policy. Examples:

- Backend-only change: skip frontend design skills.
- Plain code explanation: skip TDD and brainstorming unless behavior will change.
- Read-only diagnosis: use debugging or domain inspection, but do not implement.
- No quantitative data: skip analytics skills.
- No GitHub operation: skip `github:github`.
- No completed implementation: skip branch-finishing workflow.

## Verification

After changing the root instructions:

1. Confirm root file is named exactly `AGENTS.md`.
2. Confirm all existing XCRUIZT rules remain present.
3. Confirm every requested skill has one explicit trigger or always-on rule.
4. Confirm duplicate `nextjs-developer` input is represented once.
5. Confirm routing prevents unconditional invocation of all skills.
6. Review `git diff -- AGENT.MD AGENTS.md docs/superpowers/specs/2026-07-31-skill-routing-design.md`.

