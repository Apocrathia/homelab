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

A structured review at work-close or session-end that extracts lessons from the
work just done — and from changes that landed outside the agent's session. The
retrospective **classifies** observations and **routes** them: local context
edits, rule or skill improvements, enforcement promotion, or upstream
contributions back to prime-context.

Does not edit files directly (except non-protected drift notes). Produces a
report with classified, routed recommendations. Protected-path edits go through
normal confirmation.

## When to run

- **After a shipping lap** — after [`ship-work`](../ship-work/SKILL.md) (or
  [`draft-commit`](../draft-commit/SKILL.md) handoff) and before
  [`clock-out`](../clock-out/SKILL.md) when an MR merged. Runs while the
  worktree still exists so the retrospective can inspect the diff.
- **At session-end** — operator asks "what did we learn?"
- **After merges outside the session** — catch up on context-relevant changes.
- **Standalone** — `/retrospective` or "do a retro."

Run the retrospective while the lap worktree still exists when there is one.
Session-end / read-only capture may use the workspace root. `clock-out` tears
down the session worktree after merge — retro first.

## What it produces

1. **Outcome summary** — what happened, one or two lines.
2. **Git history findings** — significant changes that touched context surfaces,
   with rationale from commit messages and MR descriptions.
3. **Observations** — classified lessons, each with a route.
4. **Upstream candidates** — generic enough for prime-context.
5. **No-op declaration** — if nothing to capture, say so.

## Workflow

Copy this checklist and work it in order:

```
- [ ] 1. Scope the retrospective
- [ ] 2. Review the session's own work (outcome review)
- [ ] 3. Mine git history for external changes
- [ ] 4. Classify observations
- [ ] 5. Assess genericness (upstream candidates)
- [ ] 6. Route and propose actions
- [ ] 7. Record durable lessons (propose only on protected paths)
- [ ] 8. Report
```

### 1. Scope the retrospective

| Situation                              | Window                                    |
| -------------------------------------- | ----------------------------------------- |
| After a shipping lap                   | This session's diff / MR                  |
| At session-end (no ship)               | This session                              |
| After external merges                  | Since last session (or last N merged MRs) |
| Operator says "since the last release" | `git log --since` or tag-to-tag           |

If the operator names a scope (MR IID, date range, branch), use it. Otherwise
default to: this session's work + any merges to `main` since the last session
that touched context surfaces.

### 2. Review the session's own work

Standard outcome review from
[`.agents/context/learning-loop.md`](../../context/learning-loop.md):

- What actually happened (vs what was planned)?
- What worked well?
- What failed or required retries?
- Did any rule feel wrong, missing, or redundant?
- Did any context module lead you astray or leave you without what you needed?

If nothing happened (discover-only session, or work was abandoned), say so and
move to step 3 — the git history pass may still surface lessons.

### 3. Mine git history for external changes

Changes land in `main` without this agent's involvement — human commits, other
agents' MRs, hotfixes. These can shift the context landscape without a
corresponding context update.

Prefer **GitLab MCP / `glab`** when available; else `git log`. Do not assume
`gh` / GitHub.

```bash
# Since last session: commits that touched context surfaces
git log --oneline --since="<last session date or tag>" -- \
  AGENTS.md CLAUDE.md .agents/ docs/

# Recent merged MRs (GitLab) — adapt to glab / GitLab MCP filters available
glab mr list --merged --limit 20
# Then inspect each candidate with glab mr view <iid> / GitLab MCP for files
# and description when the title or path set looks context-relevant.

# If glab / GitLab MCP unavailable, use the commit log
git log --oneline --merges --since="<last session date>" -- \
  AGENTS.md CLAUDE.md .agents/ docs/
```

For each significant change found:

- **What changed** — file(s) and nature of the change.
- **Why** — extract from commit message body, MR description, or linked issue
  (`git show <sha>`, `glab mr view <iid>`, or GitLab MCP).
- **Context impact** — does the current `.agents/` context still accurately
  describe the post-change state? Flag any drift.

**What counts as significant:**

| Change                              | Why it matters for context                      |
| ----------------------------------- | ----------------------------------------------- |
| New build tooling or test framework | context / tooling docs may be stale             |
| Renamed or deleted docs             | Routing table, links may break                  |
| New app/module/package              | README model / loading may need a row           |
| Context surface edited directly     | Check whether the edit was complete or partial  |
| New rule or skill added             | Should it be generic (upstream candidate)?      |
| GitOps / domain stack change        | Domain context may need a structural suggestion |

### 4. Classify observations

| Observation type                             | Example                                         | Route                                                |
| -------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| **Context drift** (was wrong)                | Context claims X but manifests say Y            | [`reconcile-context`](../reconcile-context/SKILL.md) |
| **Context gap** (was missing)                | No context for a new subsystem the agent needed | Propose context module edit (protected path)         |
| **Context bloat** (was too much)             | A module hasn't been useful in 10+ laps         | Propose trimming or merging modules                  |
| **Rule gap** (needed one / wrong one)        | Agent violated a convention no rule covers      | Propose new or amended rule                          |
| **Skill gap** (workflow missed a step)       | A shared skill skipped a required check         | Propose skill edit                                   |
| **Enforcement gap** (rule failed repeatedly) | `protected-paths` confirmation skipped 3+ times | Propose structural enforcement (hook, CI)            |
| **Pattern** (repeated success)               | Same workaround worked in 3+ laps               | Record pattern; consider promotion                   |
| **Anti-pattern** (process failure)           | Agent skipped review-loop again                 | Record anti-pattern; consider enforcement            |

Classification criteria:

- **One failure is sufficient** for anti-patterns — no frequency threshold.
- **2+ similar successes** (or human judgment) for patterns.
- **Structural enforcement** is the promotion path for rules that fail
  repeatedly (see
  [`.agents/context/enforcement.md`](../../context/enforcement.md)).

### 5. Assess genericness (upstream candidates)

| Test                                                                          | Result                        |
| ----------------------------------------------------------------------------- | ----------------------------- |
| References lab-only infra (Flux, Helm, Talos, CNPG, Longhorn, Gateway API, …) | Domain-specific → stays local |
| Improvement works beyond this lab for other prime-context consumers           | Generic → upstream candidate  |
| Improvement to Layer 1 (generic) or Layer 2 (templatized) file                | Generic → upstream candidate  |
| Improvement to Layer 3 (project-specific) file                                | Domain-specific → stays local |

Upstream candidates are improvements to:

- Generic rules (`rules/*.md`)
- Shared skills (`skills/*/SKILL.md`)
- Scripts (`skills/reconcile-context/scripts/`)
- Templates (`templates/**/*.tmpl`) in the core

Contribute via issue/MR on prime-context; pull later with
[`integrate-upstream`](../integrate-upstream/SKILL.md).

### 6. Route and propose actions

| Route                 | Action                                          | Approval needed?                |
| --------------------- | ----------------------------------------------- | ------------------------------- |
| `reconcile-context`   | Run the skill (or note drift for next lap)      | No (skill handles it)           |
| Context module edit   | Propose edit; surface in report                 | Yes (protected path)            |
| Rule edit             | Propose edit; surface in report                 | Yes (protected path)            |
| Skill edit            | Propose edit; surface in report                 | Yes (protected path)            |
| Enforcement promotion | Propose hook/CI; surface in report              | Yes                             |
| Pattern record        | Write to `.agents/memories/<topic>.md`          | Yes (`.agents/**` is protected) |
| Anti-pattern record   | Write to `.agents/memories/<topic>.md`          | Yes (`.agents/**` is protected) |
| Upstream contribution | File issue on prime-context or open PR/MR there | Yes                             |

**Upstream contribution path:**

1. **File an issue** on prime-context (default) — improvement, evidence, proposed change.
2. **Open a PR/MR** on prime-context when the change is small and well-defined.
3. **Record locally** even if upstream is deferred — write a memory so it is not lost.

The retrospective is the **push** side (to the core). The **pull** side is
[`integrate-upstream`](../integrate-upstream/SKILL.md).

### 7. Record durable lessons

Propose writes to [`.agents/memories/`](../../memories/README.md):

- File convention: `.agents/memories/<topic>.md`
- Sections: **Context**, **Lesson**, **References**
- Keep it short — one page max per topic

If a lesson is always-on policy, it belongs in a rule or
[`constraints.md`](../../context/constraints.md), not memories.

**Promotion path** (from
[`.agents/context/learning-loop.md`](../../context/learning-loop.md)):

```text
Memory (lesson) → recurs 3+ times → Rule (.md) → fails repeatedly → Hook (structural)
```

Prune a memory entry when its lesson is structurally enforced.

### 8. Report

```markdown
## Retrospective

**Scope:** <window — this session, since <date>, MR !N, etc.>

**Outcome:** <one or two lines on what happened>

**Git history findings:** <N items, or "none">

- <sha/MR> — <what changed> — <context impact> → <action>

**Observations:** <N items, or "no lessons; no pattern">

| #   | Type   | Observation | Route   | Action            |
| --- | ------ | ----------- | ------- | ----------------- |
| 1   | <type> | <what>      | <route> | <proposed action> |

**Upstream candidates:** <N items, or "none">

- <observation> — applies to <projects> → <file issue / PR/MR / deferred>

**Memories written:** <N files, or "none">

- `.agents/memories/<topic>.md` — <one-line summary>

**Needs human judgment:**

- <anything surfaced but not acted on, and why>
```

If nothing to capture: "no lessons; no pattern."

## Integration

In attended / self-improve loops, retrospective runs after ship (or
draft-commit handoff) and before [`clock-out`](../clock-out/SKILL.md). Optional
in [`run-loop`](../run-loop/SKILL.md) — informational, not a gate. Does not
block the next lap.

## Subagents

| Step                  | Subagent                            | When                                     |
| --------------------- | ----------------------------------- | ---------------------------------------- |
| Git history mining    | `shell` or read-only Task           | When the window is large (20+ commits)   |
| Upstream contribution | `file-issue` or standalone worktree | When an upstream candidate is identified |

## Do not

- Edit protected paths without confirmation — propose, don't write
- Skip the git history pass
- Record trivia
- File upstream contributions without evidence (prefer 2+ consumer projects)
- Run the retrospective as a gate — it informs, it doesn't block
- Expand into implementation — route to the right skill instead
