---
name: reconcile-docs
description: >-
  Close the docs/backlog side of a lap: fix behavior docs the change made wrong;
  delete satisfied issues/plans; fix backlinks. Use after implement, before
  draft-commit — not for AGENTS/.agents context drift.
disable-model-invocation: true
---

# Reconcile docs

Close the **human / behavior docs + issue/plan ledger** side of a lap after
behavior moved. Chat is not the backlog; delete-on-ship keeps the ledger true.

Loop context:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

Issues: [`docs/issues/README.md`](../../../docs/issues/README.md).
Plans: [`docs/plans/README.md`](../../../docs/plans/README.md) (when present);
living plans may still live under [`.cursor/plans/`](../../../.cursor/plans/).

## Not this skill

| Skill                                                | Surface                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| **This skill** (`reconcile-docs`)                    | App/behavior READMEs, `docs/issues/`, `docs/plans/`, plan links |
| [`reconcile-context`](../reconcile-context/SKILL.md) | `AGENTS.md`, `.agents/context/`, discovery / link health        |

Run `reconcile-context` separately when agent routing or context modules drifted.
Do not fold context work into this skill.

## Hard rules

- **Never invent new features** while reconciling. Fix stale prose and ledger
  state only; out-of-scope gaps → [`file-issue`](../file-issue/SKILL.md).
- **Delete-on-ship** — no `closed/` archives. Git history is the archive.
- **Acceptance gate** — if acceptance is not met, **do not delete** the issue
  or plan; surface what remains.
- Never `git commit` / push. Never cluster-mutate.

## When to run

- After an implement lap, before `draft-commit` (when that skill exists).
- When the operator asks to close docs/backlog for a shipped change.
- Same change set as the fix whenever possible (issue/plan delete + doc fixes
  land with the behavior change).

## Workflow

```
- [ ] 1. Identify touched behavior (diff / Launch brief / linked issue+plan)
- [ ] 2. Update behavior docs that the change made wrong (READMEs, runbooks)
- [ ] 3. Check acceptance on linked docs/issues/<slug>.md
- [ ] 4. Check acceptance on linked docs/plans/<slug>.md and/or .cursor/plans/
- [ ] 5. If met → delete those files; if not → keep and list remaining gaps
- [ ] 6. Fix backlinks (other docs, plans, issues that pointed at deleted paths)
- [ ] 7. Report what changed / what stayed / blockers
```

### Behavior docs

Update only docs that describe **current** behavior and are now wrong. Do not
narrate the fix ("previously broken…"). Prefer adjacent READMEs over inventing
new doc trees. Tunable config stays in manifests (GitOps SoT).

### Issues (`docs/issues/`)

- Satisfied acceptance → **delete** `docs/issues/<slug>.md` in this change set.
- Not satisfied → leave the file; report remaining acceptance / feedback-loop
  gaps. Optional: set `status` / notes if the operator asked — do not fake
  closure.
- Skip `README.md`, `_template.md`.

### Plans (`docs/plans/` and `.cursor/plans/`)

- Satisfied plan for this lap → **delete** `docs/plans/<slug>.md` when that
  ledger is in use.
- If the living plan lived under `.cursor/plans/`, delete (or clear) that plan
  file the same way and **note** in the report that `.cursor/plans/` was the
  plan surface.
- Partial plans: do not delete; uncheck nothing retroactively to fake done —
  surface leftover checkboxes.

### Backlinks

After deletes, grep for the old paths/slugs and fix or drop links in remaining
docs, issues, and plans. Broken links left behind are unfinished reconcile.

## Output format

```markdown
## Docs reconciliation

**Behavior docs updated:** <paths or none>

**Deleted (acceptance met):**

- docs/issues/<slug>.md
- docs/plans/<slug>.md # and/or .cursor/plans/…

**Kept (acceptance not met):**

- <path> — <what's left>

**Backlinks fixed:** <paths or none>

**Hand off:** reconcile-context if AGENTS / `.agents/` drifted; else draft-commit
```

If nothing needed reconcile, say so in one line and stop.

## Homelab constraints

- Never `git commit` / push (operator commits).
- Never cluster-mutate as part of reconcile-docs.
- No secrets in doc or issue bodies.
- Protected paths still need confirmation unless the operator already ordered
  this reconcile (summarize first when touching `.agents/` / `.cursor/` only
  for backlinks that truly require it — prefer leaving agent-tree edits to
  `reconcile-context`).
