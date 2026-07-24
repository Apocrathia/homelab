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

- This repo does **not** use agent worktrees. Edit in the normal working tree
  on a `chore/integrate-upstream-*` branch if you open one; otherwise stay on
  the current branch with operator approval.
- Ship via [`draft-commit`](../draft-commit/SKILL.md) (operator commits) — not
  upstream `ship-work`.
- Do **not** write an `.agents/upstream-ref` file. If a prior sync revision is
  unknown, degrade to 2-way diff and say so.

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

## Workflow

```
- [ ] 1. Locate and load the upstream core
- [ ] 2. Inventory this project's .agents/
- [ ] 3. Categorize files by layer
- [ ] 4. Diff each layer (token-normalize layer 2)
- [ ] 5. Categorize changes (added, modified, removed, unchanged)
- [ ] 6. Reconcile modified files (3-way when baseline known)
- [ ] 7. Surface the change set for operator confirmation
- [ ] 8. Apply changes after confirmation
- [ ] 9. Wire discovery (Cursor skill/rule symlinks) for new files
- [ ] 10. Run link + discovery checks
- [ ] 11. Report
```

### 1. Locate and load the upstream core

```bash
upstream="/abs/path/to/prime-context"
# or: clone a remote to a temp dir (full history, not --depth 1)
```

Verify top-level `rules/`, `skills/`, and `templates/`. Record:

```bash
upstream_rev=$(git -C "$upstream" rev-parse HEAD)
```

If the operator does not provide a prior sync revision, step 6 is 2-way — say so
in the change set.

### 2. Inventory this project's `.agents/`

```bash
agents_dir="$(git rev-parse --show-toplevel)/.agents"
find "$agents_dir/rules" -name '*.md' 2>/dev/null | sort
find "$agents_dir/skills" -name 'SKILL.md' 2>/dev/null | sort
find "$agents_dir/skills" -path '*/scripts/*.py' 2>/dev/null | sort
find "$agents_dir/context" -name '*.md' 2>/dev/null | sort
```

### 3. Categorize files by layer

Discover upstream skills dynamically. Templatized set (scaffold classification):

`find-work implement-change ship-work self-improve reconcile-context`

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

Do **not** adopt upstream `worktrees.md` or `ship-work` / `self-improve` /
`clock-out` unless the operator explicitly asks — this repo's ship model is
operator-gated on the workspace root
([`development-loop.md`](../../context/development-loop.md#ship-model)).

### 4–6. Diff and reconcile

- Layer 1: direct `diff`.
- Layer 2: replace `{{project_name}}` then diff.
- Layer 3: structural suggestions only.
- Modified files: 3-way against baseline when known; otherwise 2-way and flag
  possible local customizations. Prefer clean apply only when local has no real
  delta. Conflicts: propose merge; never blind-take either side.

### 7. Surface the change set

Present clean applies / conflicts / new / removed / structural / skip / local
improvements to contribute back. Wait for confirmation.

### 8–9. Apply and wire

After confirmation: copy/replace/merge. For each **new** portable rule, add
`.cursor/rules/<name>.mdc` → `../../.agents/rules/<name>.md`. For each **new**
skill, add `.cursor/skills/<id>` → `../../.agents/skills/<id>`. Update
`.agents/rules/README.md`, `.cursor/rules/README.md`, `.cursor/skills/README.md`,
and `AGENTS.md` routing rows as needed. Claude skills discover via the
`.claude/skills` directory symlink.

### 10. Checks

```bash
python3 .agents/skills/reconcile-context/scripts/check_links.py
python3 .agents/skills/reconcile-context/scripts/check_discovery.py
```

### 11. Report

Hand off via [`draft-commit`](../draft-commit/SKILL.md). Optionally run
[`reconcile-context`](../reconcile-context/SKILL.md).

## Do not

- Overwrite layer 3 (context, personas, domain skills/rules, routing identity).
- Apply without operator confirmation.
- Replace lab `protected-paths` extras (`talos/**`, `helm/generic-app/**`,
  bootstrap) with the narrower upstream list.
- Skip discovery wiring or the link/discovery checks.
- Assume upstream is prime-context without verifying `rules/` + `skills/` +
  `templates/`.
