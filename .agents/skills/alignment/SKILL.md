---
name: alignment
description: >-
  Interview the operator until shared understanding. Gated branches one at a
  time; independent discrete choices may share one structured-question turn.
  Use when stress-testing an idea, design, or requirement; resolving open
  questions before acting; or when the user says alignment, /alignment, or
  wants to get aligned.
disable-model-invocation: true
---

# Alignment

Read-only. Do not edit files, apply to the cluster, create a worktree, or
implement until alignment is reached and the operator explicitly asks to
proceed.

Interview relentlessly until shared understanding
([grill-me](https://www.aihero.dev/my-grill-me-skill-has-gone-viral) pattern).
Walk gated branches one at a time; independent discrete choices may share one
structured-question turn. Explore the tree when that answers the question; do
not ask the operator to repeat what the repo already shows.

Question channel: [`.agents/context/questions.md`](../../context/questions.md).
Harness adapters name the concrete tool (Cursor: `question-format.mdc` /
[`.agents/rules/question-format.md`](../../rules/question-format.md)).

## When to run (default: early)

Run **before** writing issues, plans, or code when any of these apply:

| Trigger                            | Examples                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- |
| New app, feature, or wide change   | Desired state unclear, multiple valid approaches, stop condition fuzzy |
| Issue needs scoping                | `find-work` tier "needs scoping"; acceptance bullets not yet writable  |
| Plan needed / new or extended plan | Rough idea; turning an issue into `docs/plans/` checkboxes             |
| Security / protected-path tradeoff | Anything touching talos, generic-app, bootstrap, `.agents/`            |
| `slice: hitl`                      | Product, security posture, or protected-path tradeoffs                 |
| Implement gate                     | Manifest / code work while expectations still open                     |

**Skip** when acceptance is already explicit (clear issue file, plan checkbox
with verification). Operator "proceed" after alignment counts; **do not** skip
when scope is still fuzzy and no alignment summary exists in the thread. Do not
re-run alignment in the same thread if a summary already exists.

## Typical flow

```text
idea / gap / find-work row
        │
        ▼
   /alignment  (read-only; grill until shared understanding)
        │
        ├──► file-issue → docs/issues/
        ├──► project-planner → docs/plans/
        └──► implement-change (only after operator says proceed + dedupe)
```

Alignment output should be pasteable into an issue (**Problem**, **Acceptance**)
or plan (**Goal**, slice checkboxes) without another discovery pass.

## Next step (after proceed)

Suggested fork:

| Next                           | Invoke                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| File the gap                   | [`file-issue`](../file-issue/SKILL.md)                                                      |
| Plan the how                   | [`project-planner`](../../agents/project-planner/agent.md) → `docs/plans/`                  |
| Implement a clear Launch brief | [`implement-change`](../implement-change/SKILL.md)                                          |
| Docs-only under `docs/`        | docs worktree + documentation persona / reconcile-docs as applicable                        |
| Restore / deploy domain work   | matching skill (`helm-deployment`, restore skills, …)                                       |
| Cursor / `.agents/` / hooks    | `chore/*` worktree; protected paths per [`protected-paths`](../../rules/protected-paths.md) |
| Still fuzzy                    | more alignment (or stop if unattended)                                                      |

After proceed, ship via the hybrid model
([`development-loop.md#ship-model`](../../context/development-loop.md#ship-model)):
unauthorized → [`draft-commit`](../draft-commit/SKILL.md); authorized →
[`ship-work`](../ship-work/SKILL.md) then [`clock-out`](../clock-out/SKILL.md)
after merge. Alignment itself is read-only; later implement laps use worktrees
([`worktrees.md`](../../rules/worktrees.md)).

## Routed from

- Issue and plan authoring — before [`file-issue`](../file-issue/SKILL.md) or a
  new plan when scope is still fuzzy
- [`implement-change`](../implement-change/SKILL.md): alignment gate before worktree
- [`find-work`](../find-work/SKILL.md): Launch brief for vague or multi-path items
- [`subagents.md`](../../rules/subagents.md) and
  [`clarify-dont-guess.md`](../../rules/clarify-dont-guess.md): extended ambiguity
- [`project-planner`](../../agents/project-planner/agent.md): before heavy planning
  when several decisions depend on operator input

## Output

Short summary: decisions made, open items, suggested next step (table above).
