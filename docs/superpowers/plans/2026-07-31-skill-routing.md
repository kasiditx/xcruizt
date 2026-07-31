# XCRUIZT Skill Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make repository agents choose requested skills by task trigger while
keeping `caveman full` active for every response.

**Architecture:** Use canonical root `AGENTS.md` as the single repository
instruction entry point. Preserve existing XCRUIZT production rules and append
one routing section containing precedence, always-on skills, process routes,
domain routes, exclusions, and completion gates.

**Tech Stack:** Markdown repository instructions, Git, POSIX shell verification

## Global Constraints

- Preserve every existing rule from root `AGENT.MD`.
- Rename root instruction file to exactly `AGENTS.md`.
- Keep `caveman full` always active until the user explicitly disables it.
- Invoke only skills whose triggers match the request.
- Process skills run before implementation or domain skills.
- Do not fabricate files, APIs, fields, data, commands, or verification.
- Do not commit, push, deploy, or mutate external systems without explicit user
  authorization.
- Duplicate `nextjs-developer` input is represented once.
- Current absence of `components.json` keeps `shadcn` conditional.

---

### Task 1: Canonicalize Root Instructions and Add Skill Routing

**Files:**

- Rename: `AGENT.MD` to `AGENTS.md`
- Modify: `AGENTS.md`
- Reference:
  `docs/superpowers/specs/2026-07-31-skill-routing-design.md`

**Interfaces:**

- Consumes: existing XCRUIZT repository rules from `AGENT.MD`
- Produces: canonical root `AGENTS.md` with deterministic task-to-skill routing

- [ ] **Step 1: Capture preservation baseline**

Run:

```bash
cp AGENT.MD /tmp/xcruizt-agent-before.md
wc -l AGENT.MD
```

Expected: `/tmp/xcruizt-agent-before.md` exists; line count is non-zero.

- [ ] **Step 2: Rename without rewriting existing content**

Use a patch move:

```text
*** Update File: AGENT.MD
*** Move to: AGENTS.md
```

Expected: `AGENT.MD` no longer exists; `AGENTS.md` contains the unchanged
original instructions.

- [ ] **Step 3: Append exact skill-routing sections**

Append these sections after the existing completion gate:

```markdown
## 11. Skill Routing

### Routing principles

- Keep `caveman full` active for every response until the user explicitly
  disables it.
- Use `superpowers:using-superpowers` before responding or acting to select
  applicable skills.
- Invoke the smallest relevant skill set. A skill listed here is not
  automatically applicable to every task.
- Apply process skills before domain and implementation skills.
- When skills conflict, follow the user request and repository rules first,
  then the more specific task skill.
- Never weaken security, authorization, data integrity, scope, or evidence
  requirements to satisfy another skill.

### Process routes

- New feature, component, behavior, functionality, or configuration:
  `superpowers:brainstorming` before implementation; obtain design approval.
- Feature or bug implementation: `superpowers:test-driven-development`; verify
  RED, GREEN, then refactor. Ask before using a documented TDD exception.
- Bug, test failure, regression, or unexpected behavior:
  `superpowers:systematic-debugging`; establish root cause before proposing a
  fix.
- Review feedback: `superpowers:receiving-code-review`; verify each suggestion
  against current repository evidence before implementation.
- Completion, passing, fixed, commit, or PR claim:
  `superpowers:verification-before-completion`; run fresh proving commands.
- Completed implementation with a green full suite:
  `superpowers:finishing-a-development-branch`; present its integration options
  only when branch integration is in scope.

### Frontend routes

- React component, hook, state, rendering, Suspense, or React tests:
  `react-expert`.
- Next.js App Router, RSC, Server Action, Route Handler, caching, metadata, or
  deployment: `nextjs-developer`.
- New UI or major visual reshape: `impeccable` and `frontend-design`; pass the
  Impeccable preflight before edits.
- Production UI implementation: `frontend-ui-engineering`.
- Existing UI audit or plan-only improvement: `improve-ui`; keep product source
  read-only and write only under `design-plans/`.
- UI polish, surfaces, icons, hover, press, or micro-interactions: `better-ui`.
- Controls, forms, dialogs, focus, keyboard, ARIA, or contrast:
  `fixing-accessibility`.
- Animation or motion performance: `fixing-motion-performance`.
- SEO, canonical, Open Graph, icons, manifest, or structured data:
  `fixing-metadata`.
- shadcn work: `shadcn` only when `components.json` exists or the user
  explicitly requests shadcn; inspect project info and component docs first.

Do not combine `improve-ui` source-read-only work with product-source
implementation in the same task.

### Data and analytics routes

- KPI definitions, drivers, guardrails, or targets:
  `data-analytics:design-kpis`.
- Dashboard or scorecard: `data-analytics:build-dashboard`.
- WBR, MBR, QBR, KPI status, or executive readout:
  `data-analytics:kpi-reporting`.
- Metric movement, anomaly, or discrepancy:
  `data-analytics:metric-diagnostics`.
- Source completeness, uniqueness, validity, integrity, freshness, or drift:
  `data-analytics:analyze-data-quality`.
- Analysis, calculation, comparison, chart, or conclusion QA:
  `data-analytics:validate-data`.
- Quantitative chart selection, implementation, revision, or QA:
  `data-analytics:visualize-data`.

For analytics, confirm source, grain, freshness, time window, filters,
denominator, and timezone before precise claims. If a required source is
unavailable, stop the source-backed path and state exactly what access or
artifact is needed. Never fabricate metrics, data, targets, or evidence.

### GitHub route

- Repository, issue, or PR context: `github:github`.
- Prefer connected GitHub data for issue and PR metadata.
- Use local `git` or `gh` for current-branch discovery, branch operations, and
  Actions logs when required.
- Commit, push, PR creation, merge, and cleanup still require explicit user
  authorization and the applicable verification gate.

### Non-applicable cases

- Backend-only change: skip frontend design skills.
- Read-only explanation: skip brainstorming and TDD unless behavior will
  change.
- Read-only diagnosis: diagnose and report; do not implement unless requested.
- No quantitative data: skip analytics skills.
- No GitHub operation: skip `github:github`.
- No completed implementation: skip branch-finishing workflow.
```

- [ ] **Step 4: Verify original rules were preserved byte-for-byte**

Run:

```bash
original_lines=$(wc -l < /tmp/xcruizt-agent-before.md)
head -n "$original_lines" AGENTS.md | cmp -s /tmp/xcruizt-agent-before.md -
```

Expected: exit code `0`.

- [ ] **Step 5: Verify canonical filename**

Run:

```bash
test -f AGENTS.md
test ! -e AGENT.MD
```

Expected: both commands exit `0`.

- [ ] **Step 6: Verify requested skill coverage**

Run:

```bash
for skill in \
  caveman \
  superpowers:using-superpowers \
  impeccable \
  react-expert \
  nextjs-developer \
  superpowers:brainstorming \
  superpowers:test-driven-development \
  superpowers:systematic-debugging \
  superpowers:verification-before-completion \
  superpowers:receiving-code-review \
  superpowers:finishing-a-development-branch \
  github:github \
  data-analytics:design-kpis \
  data-analytics:build-dashboard \
  data-analytics:kpi-reporting \
  data-analytics:metric-diagnostics \
  data-analytics:visualize-data \
  data-analytics:analyze-data-quality \
  data-analytics:validate-data \
  frontend-design \
  frontend-ui-engineering \
  shadcn \
  better-ui \
  fixing-metadata \
  fixing-accessibility \
  fixing-motion-performance \
  improve-ui
do
  grep -Fq "$skill" AGENTS.md || exit 1
done
```

Expected: exit code `0`.

- [ ] **Step 7: Verify duplicate input is normalized**

Run:

```bash
test "$(grep -o 'nextjs-developer' AGENTS.md | wc -l | tr -d ' ')" = "1"
```

Expected: exit code `0`.

- [ ] **Step 8: Check Markdown patch quality and final diff**

Run:

```bash
git diff --check
git diff -- AGENT.MD AGENTS.md \
  docs/superpowers/specs/2026-07-31-skill-routing-design.md \
  docs/superpowers/plans/2026-07-31-skill-routing.md
git status --short
```

Expected: `git diff --check` exits `0`; diff contains only the intended root
instruction rename, routing section, spec, and plan plus pre-existing unrelated
user changes shown separately in status.

- [ ] **Step 9: Do not commit without authorization**

Report the changed paths and verification results. Leave changes uncommitted
unless the user explicitly requests a commit.

