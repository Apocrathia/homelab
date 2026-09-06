---
name: review-correctness
description: >-
  Read-only correctness lens for a branch diff, uncommitted changes, or named
  Artifact. Use when review-loop spawns the correctness pass, or when asked for
  a correctness review, logic review, or bug hunt on a diff.
disable-model-invocation: true
---

# Review correctness

Read-only lens: logic, behavior, and failure modes in the Artifact. Return
`pass` or numbered findings. Do not edit files, commit, push, or invoke named
review CLIs.

Called by [`review-loop`](../review-loop/SKILL.md) or standalone. Isolation uses
**task folders** when the parent needs a sandbox; do not require worktrees.

## Soft model slot

**Cheapest capable.** Prefer the lightest model that can read the diff and cite
evidence. Do not default-inherit the parent model when the harness exposes a
separate slot.

## Persona

Load [`.agents/agents/reviewer/agent.md`](../../agents/reviewer/agent.md) when present.

**Fallback (inline):** Judge only. Read cited paths and the diff; compare claims
to code. Return evidence, not vibes. No edits, no fixes, no self-grade against
Bar after hypothetical fixes.

## Bar

**Correctness:** no actionable logic or behavior defects in scope. Actionable
means a concrete bug, wrong branch, missing error handling on a reachable path,
race or lifecycle mistake, broken invariant, or behavior change without a
matching test when the project already tests that surface.

Out of scope for this lens: security posture (see `review-security`), design
fit (see `review-fit`), style-only nits, and pre-existing issues untouched by
the Artifact.

## Artifact

Parent or operator supplies:

| Field      | Meaning                                                      |
| ---------- | ------------------------------------------------------------ |
| Repository | Absolute repo root                                           |
| Scope      | Branch diff (default), uncommitted only, or named paths      |
| Base       | Merge base branch when scope is branch diff                  |
| Slice      | Optional label (e.g. `review-loop/2`) for fresh Task context |

Read the diff with git or the editor tools. Inspect cited files at the claimed
lines before filing a finding.

## What to judge

- Wrong or incomplete handling of inputs, errors, and edge cases
- Off-by-one, null/empty, timezone, and concurrency mistakes
- Broken control flow, unreachable code that hides a bug, or silent failure
- Mismatch between stated intent (commit, ticket, comment) and actual behavior
- Tests that do not cover changed behavior when similar code is already tested
- Regressions introduced by the diff itself

Skip findings that require speculative runtime state you cannot verify from the
Artifact and nearby code.

## Task prompt (when parent spawns)

Use the contract in [`.agents/rules/subagents.md`](../../rules/subagents.md):

```text
Slice: <slice or review-correctness>
Role: reviewer
Goal: Judge the Artifact against the correctness Bar. Return findings only.
Bar: correctness; no actionable logic or behavior defects in scope
Artifact: <repository>; scope <branch diff | uncommitted | named paths>
Repository: <absolute path>
Worktree: <absolute worktree path>
Scope: <branch diff against base | uncommitted | paths>
Base: <base branch if branch diff>
Task folder: <absolute task folder path when parent binds one>
Report path: <task-folder>/iter-<N>-correctness.md

Constraints:
- Read-only. Do not edit files (except writing the named report).
- Do not run named review CLIs.
- Load persona from .agents/agents/reviewer/agent.md when present.
- Write the full report to Report path; return short status + report_path.

Return (short):
## Correctness
result: pass | gap
report_path: <absolute path>
findings: numbered list (path, line/area, severity, summary)  # full body in report
errors: … (if blocked)
```

## Return

Write the long report to the parent-named task-folder path
(`iter-<N>-correctness.md` when following review-loop). Return a short status
plus `report_path`; do not paste the full report into chat.

**Pass:** `result: pass`, `report_path`, and a one-line confirmation.

**Gap:** numbered findings in the report. Each finding includes:

1. **Path** and **line/area**
2. **Severity:** blocker | major | minor
3. **Summary:** one line
4. **Full body:** evidence, expected vs actual, and why it matters

Parent triages valid / wrong / unsure. This lens does not fix or re-run itself.

## Do not

- Edit, format, or commit in this skill
- Invoke named review CLIs or substitute them for reading the Artifact
- File security or architecture findings (other lenses own those Bars)
- Require worktrees; task folders are enough when isolation is needed
