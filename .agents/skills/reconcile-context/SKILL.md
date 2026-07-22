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
  (steps 2–4 need judgment — keep those as an explicit invocation).

## Workflow

```
- [ ] 1. Link and anchor check (script)
- [ ] 2. Structural drift (README inventory, routing, loading)
- [ ] 3. Harvest <!-- drift: --> notes
- [ ] 4. Apply thin fixes (ask on protected paths)
- [ ] 5. Re-run the script; it must pass. Report.
```

### 1. Link and anchor check

```bash
python3 .agents/skills/reconcile-context/scripts/check_links.py
```

Pass `--all` to check every tracked markdown file. Fix or drop broken targets.

Hook-safe: no side effects, nonzero exit on broken links.

### 2. Structural drift

- **README** tree map vs real top-level dirs; module inventory vs files on disk.
- **Routing table** in `AGENTS.md`: every row target exists; every context module
  except `README.md` appears in a routing or loading row.
- **loading.md** surfaces still exist.
- **Skill / persona indexes**: `.agents` README and Cursor README tables match
  directories on disk.

### 3. Drift notes

```bash
grep -rn "<!-- drift:" AGENTS.md .agents/
```

Act or surface; delete the comment when resolved. The fenced example in
[`.agents/context/README.md`](../../context/README.md#living-context) is
the format spec, not a real note — skip it.

### 4. Fixes

Keep modules thin. Link to `docs/` and skills; do not paste tunable config.
`.agents/**`, `.cursor/**`, and `AGENTS.md` are protected; summarize and get
confirmation unless the operator already ordered this reconcile. For a
readonly detect-only pass, prefer the [`context-steward`](../../agents/context-steward/agent.md)
persona (propose edits; do not write).

### 5. Re-run and report

Run the link check again; it must pass. Then report:

```markdown
## Context reconciliation

**Drift found:** <N items>

- <file> — <what was stale> → <what it now says>

**Needs human judgment:**

- <drift note or ambiguous case left alone, and why>

**Link check:** <pass | N fixed>
```

If nothing drifted, say so in one line and stop.

## Wiring

The link check runs from pre-commit and pre-push via the `context-links` hook in
[`.pre-commit-config.yaml`](../../../.pre-commit-config.yaml) on changes to
`AGENTS.md`, `CLAUDE.md`, and `.agents/**/*.md`. CI runs the same script from
[`.gitlab/context-links.gitlab-ci.yml`](../../../.gitlab/context-links.gitlab-ci.yml).
Keep the full reconcile (steps 2–4) as an explicit invocation.
