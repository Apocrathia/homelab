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

## Workflow

```
- [ ] 1. Link and anchor check (script)
- [ ] 2. Structural drift (README inventory, routing, loading)
- [ ] 3. Harvest <!-- drift: --> notes
- [ ] 4. Apply thin fixes (ask on protected paths)
- [ ] 5. Re-run the script and report
```

### 1. Link and anchor check

```bash
python3 .agents/skills/reconcile-context/scripts/check_links.py
```

Pass `--all` to check every tracked markdown file. Fix or drop broken targets.

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

Act or surface; delete the comment when resolved.

### 4. Fixes

Keep modules thin. Link to `docs/` and skills; do not paste tunable config.
`.agents/**`, `.cursor/**`, and `AGENTS.md` are protected; summarize and get
confirmation unless the operator already ordered this reconcile.

### 5. Report

What broke, what you fixed, what still needs a human.
