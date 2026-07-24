---
name: retrospective
description: >-
  Structured post-work retrospective: review outcomes, mine git history for
  context-relevant changes outside the session, extract lessons, classify them,
  and route improvements — local context edits, rule/skill/enforcement proposals,
  or upstream contributions to prime-context. Use when the user says retro,
  /retrospective, what did we learn, or at work-close / session-end after a lap.
disable-model-invocation: true
---

# Retrospective

A structured review at work-close or session-end. Classifies observations and
**routes** them: local context edits, rule/skill improvements, enforcement
promotion, or upstream contributions back to prime-context.

Does not edit files directly (except non-protected drift notes). Produces a
report with classified, routed recommendations. Protected-path edits go through
normal confirmation.

## When to run

- After a shipping lap — after [`draft-commit`](../draft-commit/SKILL.md) handoff
  (and optional [`watch-mr`](../watch-mr/SKILL.md) if an MR was opened).
- At session-end — operator asks "what did we learn?"
- After merges outside the session — catch up on context-relevant changes.
- Standalone — `/retrospective` or "do a retro."

This repo does not use agent worktrees or `clock-out`. Retrospectives run in the
normal working tree.

## What it produces

1. **Outcome summary** — what happened, one or two lines.
2. **Git history findings** — significant changes that touched context surfaces.
3. **Observations** — classified lessons, each with a route.
4. **Upstream candidates** — generic enough for prime-context.
5. **No-op declaration** — if nothing to capture, say so.

## Workflow

```
- [ ] 1. Scope the retrospective
- [ ] 2. Review the session's own work
- [ ] 3. Mine git history for external changes
- [ ] 4. Classify observations
- [ ] 5. Assess genericness (upstream candidates)
- [ ] 6. Route and propose actions
- [ ] 7. Record durable lessons (propose only on protected paths)
- [ ] 8. Report
```

### 1. Scope

| Situation                              | Window                                    |
| -------------------------------------- | ----------------------------------------- |
| After a shipping lap                   | This session's diff / MR                  |
| At session-end (no ship)               | This session                              |
| After external merges                  | Since last session (or last N merged MRs) |
| Operator says "since the last release" | `git log --since` or tag-to-tag           |

### 2. Review the session's own work

- What actually happened vs planned?
- What worked / failed / needed retries?
- Did any rule feel wrong, missing, or redundant?
- Did any context module lead you astray?

### 3. Mine git history

Prefer GitLab MCP / `glab` when available; else `git log`.

```bash
git log --oneline --since="<last session date or tag>" -- \
  AGENTS.md CLAUDE.md .agents/ docs/
```

For each significant change: what / why / context impact.

### 4. Classify

| Type                   | Route                                                |
| ---------------------- | ---------------------------------------------------- |
| Context drift          | [`reconcile-context`](../reconcile-context/SKILL.md) |
| Context gap / bloat    | Propose context edit (protected)                     |
| Rule / skill gap       | Propose rule or skill edit (protected)               |
| Enforcement gap        | Propose hook/CI                                      |
| Pattern / anti-pattern | Propose `.agents/memories/<topic>.md`                |

### 5. Upstream candidates

Generic if it applies beyond this lab (shared rules/skills/scripts). Domain
(Flux, Helm, Talos, CNPG, …) stays local. Contribute via issue/PR on
prime-context; pull later with
[`integrate-upstream`](../integrate-upstream/SKILL.md).

### 6–7. Route and memories

Propose actions; get confirmation before writing `.agents/**`. Memories:
[`.agents/memories/`](../../memories/README.md). Always-on policy belongs in a
rule or [`constraints.md`](../../context/constraints.md), not memories.

Promotion path: Memory → recurs 3+ times → Rule → fails repeatedly → Hook.

### 8. Report

```markdown
## Retrospective

**Scope:** <window>
**Outcome:** <one or two lines>
**Git history findings:** <N items, or "none">
**Observations:** table of type / observation / route / action
**Upstream candidates:** <N items, or "none">
**Memories written:** <N files, or "none">
**Needs human judgment:** <…>
```

If nothing to capture: "no lessons; no pattern."

## Integration

Optional step after a lap in [`run-loop`](../run-loop/SKILL.md) / attended work —
informational, not a gate. Does not block the next lap.

## Do not

- Edit protected paths without confirmation
- Skip the git history pass
- Record trivia
- File upstream contributions without evidence (prefer 2+ consumer projects)
- Expand into implementation — route to the right skill instead
