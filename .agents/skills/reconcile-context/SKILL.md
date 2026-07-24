---
name: reconcile-context
description: >-
  Reconcile AGENTS.md and .agents/context/ against the repo: fix broken links,
  catalog drift, and routing mismatches. Use when asked to sync, reconcile, or
  update the agent context.
---

# Reconcile context

Keep [`AGENTS.md`](../../../AGENTS.md) and [`.agents/context/`](../../context/README.md)
true and thin. Stale context text is confidently wrong.

## When to run

- Explicitly, when someone asks to sync or reconcile the context.
- After any change that moves docs, renames headings, or adds/removes context
  modules, skills, or personas.
- From the `context-links` pre-commit/pre-push hook for the **link check only**
  (steps 2–5 need judgment — keep those as an explicit invocation).

## Workflow

```
- [ ] 1. Link and discovery check (script)
- [ ] 2. Structural drift (README inventory, routing, loading)
- [ ] 3. Reality drift (claims vs repo — thin)
- [ ] 4. Harvest <!-- drift: --> notes
- [ ] 5. Apply thin fixes (ask on protected paths)
- [ ] 6. Re-run the scripts; they must pass. Report.
```

### 1. Link and discovery check

```bash
python3 .agents/skills/reconcile-context/scripts/check_links.py
python3 .agents/skills/reconcile-context/scripts/check_discovery.py
```

Pass `--all` to check every tracked markdown file. Fix or drop broken targets.

`check_discovery.py` verifies Cursor/Claude discovery symlinks against the
`.agents/` source of truth (agent/skill links, `.claude/skills`, `CLAUDE.md`).

Hook-safe: no side effects, nonzero exit on broken links or discovery drift.

### 2. Structural drift

- **README** tree map vs real top-level dirs; module inventory vs files on disk.
- **Routing table** in `AGENTS.md`: every row target exists; every context module
  except `README.md` appears in a routing or loading row.
- **loading.md** surfaces still exist.
- **Skill / persona indexes**: `.agents` README and Cursor README tables match
  directories on disk, and `check_discovery.py` must pass.

### 3. Reality drift

Check thin claims against the repo (do not invent new modules):

- [`constraints.md`](../../context/constraints.md) / [`README.md`](../../context/README.md)
  still match GitOps non-negotiables (Gateway API, 1Password Items, manifests as
  SoT) — if the product model changed, update context in the same lap.
- New always-on portable rules or skills on disk missing from `AGENTS.md`
  routing / rules README / Cursor discovery (step 2 usually catches this).
- Do **not** replace local `check_*.py` with upstream copies blindly — homelab
  scripts allow discovery symlinks and untracked ledger paths; upstream may
  regress that. Diff first; keep local when ahead.

### 4. Drift notes

```bash
grep -rn "<!-- drift:" AGENTS.md .agents/
```

Act or surface; delete the comment when resolved. The fenced example in
[`.agents/context/README.md`](../../context/README.md#living-context) is
the format spec, not a real note — skip it.

### 5. Fixes

Keep modules thin. Link to `docs/` and skills; do not paste tunable config.
`.agents/**`, `.cursor/**`, and `AGENTS.md` are protected; summarize and get
confirmation unless the operator already ordered this reconcile. For a
readonly detect-only pass, prefer the [`context-steward`](../../agents/context-steward/agent.md)
persona (propose edits; do not write).

### 6. Re-run and report

Run the link and discovery checks again; they must pass. Then report:

```markdown
## Context reconciliation

**Drift found:** <N items>

- <file> — <what was stale> → <what it now says>

**Needs human judgment:**

- <drift note or ambiguous case left alone, and why>

**Link / discovery check:** <pass | N fixed>
```

If nothing drifted, say so in one line and stop.

## Wiring

The link check runs from pre-commit and pre-push via the `context-links` hook in
[`.pre-commit-config.yaml`](../../../.pre-commit-config.yaml) on changes to
`AGENTS.md`, `CLAUDE.md`, and `.agents/**/*.md`. CI runs the same script from
[`.gitlab/context-links.gitlab-ci.yml`](../../../.gitlab/context-links.gitlab-ci.yml).
Keep the full reconcile (steps 2–5) as an explicit invocation.
