---
name: integrate-upstream
description: >-
  Pull changes from the prime-context core into this project's existing
  .agents/ tree — diff shared rules, skills, and scripts, reconcile layer 1 and
  2 changes, and preserve project-specific content. Use when the user says sync
  upstream, integrate upstream changes, pull updates from the core, or update
  .agents/ from prime-context.
disable-model-invocation: true
---

# Integrate upstream

This repo's `.agents/` shares a portable core with
[prime-context](https://github.com/PrimeIntellect-ai/prime-context). The core
evolves — new rules, improved skills, better scripts. This skill pulls those
upstream changes in while preserving homelab domain content (layer 3).

| Layer                | What                                          | How this skill handles it                               |
| -------------------- | --------------------------------------------- | ------------------------------------------------------- |
| 1 — Generic          | Rules, byte-identical skills, scripts         | Direct diff; copy or reconcile                          |
| 2 — Templatized      | Skills with `{{project_name}}` tokens         | Diff after token normalization; reconcile               |
| 3 — Project-specific | Context modules, agent personas, routing rows | **Do not overwrite.** Check templates structurally only |

Homelab notes:

- Edit in a git worktree under `.worktrees/`
  ([`worktrees.md`](../../rules/worktrees.md)). Do not edit the workspace root
  checkout.
- Ship via [`draft-commit`](../draft-commit/SKILL.md) (operator commits) when
  unauthorized; authorized contribute uses [`ship-work`](../ship-work/SKILL.md).
- Do **not** write an `.agents/upstream-ref` file. If a prior sync revision is
  unknown, degrade to 2-way diff and say so.
- Prefer GitLab MR terminology (`glab` / GitLab MCP). Treat "PR" in upstream
  docs as **MR** here.
- Do not replace lab [`protected-paths`](../../rules/protected-paths.md) extras
  (`talos/**`, `helm/generic-app/**`, `flux/manifests/01-bootstrap/**`) with the
  narrower upstream list.

## When to run

- Operator says sync upstream, update from the core, pull prime-context
  changes, or integrate upstream.
- After the core ships changes this consumer wants.
- Before a `reconcile-context` pass when shared files may be stale.

## What you need from the operator

- **Upstream core path** — local clone (preferred), git remote URL, or
  submodule path. Default local path if present:
  `/Users/ianyoung/Projects/prime-context` (or `../prime-context` relative to
  this repo).
- **Project name** — for `{{project_name}}` normalization. Default: `homelab`
  (or derive from `AGENTS.md`).

All `.agents/**` (and related adapters) are protected — surface the full change
set before writing ([`protected-paths`](../../rules/protected-paths.md)).

## Branch and MR naming

Every prime-context integration — first-time scaffold or later sync — uses a
greppable branch pattern and a constant MR title:

| Thing    | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Branch   | `chore/integrate-prime-context` **or** dated                     |
|          | `chore/integrate-prime-context-<YYYYMMDDHHMM>`                   |
| MR title | `chore(agents): integrate prime-context for assisted agent work` |

Prefer the **dated** form when a prior integration branch/MR already exists, or
when `ship-work` / host tooling resolves an undated branch to an old merged MR
and would silently skip creating a new one. If two integrations start in the
same minute, `git worktree add -b` refuses the duplicate; bump the timestamp
and rerun.

Derive the timestamp, do not copy it:

```bash
branch="chore/integrate-prime-context-$(date -u +%Y%m%d%H%M)"   # e.g. chore/integrate-prime-context-202608071432
# or, when no collision risk and operator prefers a short name:
# branch="chore/integrate-prime-context"
```

One token for the date suffix, not `-2026-08-07-14-32`.

Work in a worktree on that branch under `.worktrees/`.

## Workflow

Copy this checklist and work it in order:

```
- [ ] 1. Locate and load the upstream core
- [ ] 2. Inventory this project's .agents/
- [ ] 3. Categorize files by layer
- [ ] 4. Diff each layer (token-normalize layer 2)
- [ ] 5. Categorize changes (added, modified, removed, unchanged)
- [ ] 6. Reconcile modified files (3-way when baseline known)
- [ ] 7. Surface the change set for operator confirmation
- [ ] 8. Apply changes after confirmation
- [ ] 9. Wire discovery (Cursor skill/rule/agent symlinks) for new files
- [ ] 10. Run link + discovery checks
- [ ] 11. Report
```

### 1. Locate and load the upstream core

```bash
# Local clone — use as-is
upstream="/abs/path/to/prime-context"

# Git remote — clone to temp (full history, not --depth 1)
upstream=$(mktemp -d)
git clone <remote-url> "$upstream"

# Submodule — use the submodule path
upstream="<repo-root>/<submodule-path>"
```

Verify top-level `rules/`, `skills/`, and `templates/`. Record:

```bash
upstream_rev=$(git -C "$upstream" rev-parse HEAD 2>/dev/null || echo "unknown")
echo "Upstream revision: $upstream_rev"
```

Also determine the **baseline revision** — the upstream revision this project
was last synced from. Homelab does **not** keep `.agents/upstream-ref`. If the
operator does not provide a prior sync revision, search git history for the
most recent upstream-integration commit touching `.agents/skills/`, or degrade
step 6 to 2-way and say so in the change set.

### 2. Inventory this project's `.agents/`

```bash
agents_dir="$(git rev-parse --show-toplevel)/.agents"
find "$agents_dir/rules" -name '*.md' 2>/dev/null | sort
find "$agents_dir/skills" -name 'SKILL.md' 2>/dev/null | sort
find "$agents_dir/skills" -path '*/scripts/*.py' 2>/dev/null | sort
find "$agents_dir/context" -name '*.md' 2>/dev/null | sort
find "$agents_dir/agents" -name '*.md' 2>/dev/null | sort
find "$agents_dir/references" -type f 2>/dev/null | sort
ls "$agents_dir/mcp.json" 2>/dev/null
```

Also read `AGENTS.md` for the project name. Check that personas exist for roles
shared skills invoke (homelab names may differ from upstream scaffold names —
map by role, not filename).

### 3. Categorize files by layer

Discover upstream skills dynamically. Templatized set (scaffold classification):

`find-work implement-change ship-work self-improve reconcile-context`

```bash
templatized_skills="find-work implement-change ship-work self-improve reconcile-context"
for d in "$upstream"/skills/*/; do
  name=$(basename "$d")
  skill="$d/SKILL.md"
  [ -f "$skill" ] || continue
  if echo " $templatized_skills " | grep -q " $name "; then
    echo "templatized:$name"
  else
    echo "byte-identical:$name"
  fi
done
```

| Layer                     | Upstream source                         | Consume                                         |
| ------------------------- | --------------------------------------- | ----------------------------------------------- |
| 1 — Generic rules         | `rules/*.md`                            | `.agents/rules/*.md`                            |
| 1 — Byte-identical skills | `skills/<name>/` (not templatized)      | `.agents/skills/<name>/`                        |
| 1 — Scripts               | `skills/reconcile-context/scripts/*.py` | `.agents/skills/reconcile-context/scripts/*.py` |
| 2 — Templatized skills    | templatized names above                 | same, after `{{project_name}}` → `homelab`      |
| 3 — Templates             | `templates/**`                          | structural check only                           |

Homelab-only (leave alone): `security.md`, `ponytail.md`, `helm-deployment`,
`mcp-deployment`, restore skills, `draft-commit`, `watch-mr`, `run-loop`, all
personas, domain rules (`flux.md`, `gitops.md`, `helm.md`, `talos.md`, etc.).

Adopt / reconcile upstream `ship-work` / `self-improve` / `clock-out` with
GitLab adaptations (`watch-mr`, no direct `main` on autonomous laps) per
[`development-loop.md#ship-model`](../../context/development-loop.md#ship-model).
Keep `draft-commit` as the unauthorized default. Do adopt / reconcile upstream
`worktrees.md` (homelab requires agent worktrees).

### 4. Diff each layer

- **Layer 1:** `diff "$local" "$upstream"` — any difference is a real change.
- **Layer 2:** Replace `{{project_name}}` in upstream with `homelab`, then
  diff. Name-only diffs → aligned; other diffs → real upstream changes.
- **Layer 3:** Structural suggestions only — do not overwrite content.

### 5. Categorize changes

| Category             | Meaning                                         | Default action               |
| -------------------- | ----------------------------------------------- | ---------------------------- |
| **unchanged**        | Files are identical (after token normalization) | Skip                         |
| **added upstream**   | File exists in core but not locally             | Copy (token-replace layer 2) |
| **modified**         | File exists in both but content differs         | Reconcile (step 6)           |
| **removed upstream** | File exists locally but not in core             | Surface for decision         |
| **project-specific** | No upstream counterpart                         | Skip (layer 3)               |

### 6. Reconcile modified files

When baseline is known, 3-way:

1. **Upstream delta** — `git -C "$upstream" diff <baseline_rev>..HEAD -- <file>`
2. **Local customization** — compare local against upstream at baseline (or
   current upstream with tokens normalized if baseline unknown)
3. **Decide:**
   - **Clean apply** — no real local delta → take upstream (token-replace layer 2)
   - **Conflict** — merge; propose resolution; never blind-take either side
   - **Local improvement** — surface for possible contribution back to prime-context

When baseline is unknown: 2-way only; flag possible local customizations.

### 7. Surface the change set

Present the full change set before writing. Wait for confirmation.

```markdown
## Upstream integration — proposed changes

**Upstream core:** <path or remote>
**Upstream revision:** <sha>
**Baseline:** <sha | unknown — 2-way>
**Project name:** homelab
**Branch:** <e.g. `chore/integrate-prime-context-202608071432`>

### Clean applies (replace)

- `.agents/rules/general.md` — <why>
- …

### Needs reconciliation (conflict)

- `.agents/skills/<name>/SKILL.md` — upstream changed X; local has Y.
  Proposed: <merge plan>. **Review before applying.**

### New files (copy)

- `.agents/skills/<name>/SKILL.md` — …
- …

### Removed upstream

- `.agents/rules/<old>.md` — upstream deleted. Remove locally?

### Structural suggestions (layer 3)

- `.agents/context/<module>.md` — upstream template added section Z. Consider?

### Skip (unchanged)

N files unchanged after token normalization.

### Local improvements (consider contributing back)

- `.agents/skills/<name>/SKILL.md` — local has <advantage>
```

### 8–9. Apply and wire

After confirmation: copy/replace/merge. For each **new** portable rule, add
`.cursor/rules/<name>.mdc` → `../../.agents/rules/<name>.md`. For each **new**
skill, add `.cursor/skills/<id>` → `../../.agents/skills/<id>`. For new
personas, wire Cursor/Claude agent discovery to
`.agents/agents/<name>/agent.md`. Update `.agents/rules/README.md`,
`.cursor/rules/README.md`, `.cursor/skills/README.md`, and `AGENTS.md` routing
rows as needed. Claude skills discover via the `.claude/skills` directory
symlink.

### 10. Checks

```bash
python3 .agents/skills/reconcile-context/scripts/check_links.py
python3 .agents/skills/reconcile-context/scripts/check_discovery.py
```

### 11. Report

```markdown
## Upstream integration

**Upstream core:** <path or remote>
**Branch:** <branch name>
**Result:** <N files changed | N clean applies, N reconciled, N new, N removed>

### Changes applied

- <file> — <what changed>

### Structural suggestions (not applied)

- <file> — <suggestion>

### Local improvements to contribute back

- <file> — <what local does better>

### Link / discovery check: <pass | N fixed>

### Next

- Hand off via [`draft-commit`](../draft-commit/SKILL.md) (or authorized
  [`ship-work`](../ship-work/SKILL.md))
- MR title: `chore(agents): integrate prime-context for assisted agent work`
- Optionally run [`reconcile-context`](../reconcile-context/SKILL.md)
- Contribute local improvements back to the core when evidence supports it
```

A clean pass with nothing to change is a valid outcome. Say so and stop.

## Do not

- Overwrite layer 3 (context, personas, domain skills/rules, routing identity).
- Apply without operator confirmation.
- Replace lab `protected-paths` extras (`talos/**`, `helm/generic-app/**`,
  bootstrap) with the narrower upstream list.
- Write `.agents/upstream-ref`.
- Skip discovery wiring or the link/discovery checks.
- Assume upstream is prime-context without verifying `rules/` + `skills/` +
  `templates/`.
- Reconcile by blindly taking either side.
