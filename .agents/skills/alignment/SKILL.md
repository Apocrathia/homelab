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

Read-only. Do not edit files, apply to the cluster, or implement until alignment
is reached and the operator explicitly asks to proceed.

Interview relentlessly until shared understanding
([grill-me](https://www.aihero.dev/my-grill-me-skill-has-gone-viral) pattern).
Walk gated branches one at a time; independent discrete choices may share one
structured-question turn. Explore the tree when that answers the question; do
not ask the operator to repeat what the repo already shows.

Question channel: [`.agents/context/questions.md`](../../context/questions.md).
Harness adapters name the concrete tool (Cursor: `question-format.mdc`).

## When to run

| Trigger                            | Examples                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| New app or wide change             | Desired state unclear, multiple valid approaches            |
| Plan needed                        | Rough idea; acceptance not writable yet                     |
| Security / protected-path tradeoff | Anything touching talos, generic-app, bootstrap, `.agents/` |
| Implement gate                     | Manifest work while expectations still open                 |

**Skip** when acceptance is already explicit. Do not re-run in the same thread
if a summary already exists.

## Next step (after proceed)

Pasteable enough for an issue (**Problem**, **Acceptance**) or plan (**Goal**,
slice checkboxes). Suggested fork:

| Next                           | Invoke                                                                     |
| ------------------------------ | -------------------------------------------------------------------------- |
| File the gap                   | [`file-issue`](../file-issue/SKILL.md)                                     |
| Plan the how                   | [`project-planner`](../../agents/project-planner/agent.md) → `docs/plans/` |
| Implement a clear Launch brief | [`implement-change`](../implement-change/SKILL.md)                         |
| Restore / deploy domain work   | matching skill (`helm-deployment`, restore skills, …)                      |
| Still fuzzy                    | more alignment (or stop if unattended)                                     |

Do **not** route to upstream `ship-work` / worktrees — ship via
[`draft-commit`](../draft-commit/SKILL.md) per
[`development-loop.md#ship-model`](../../context/development-loop.md#ship-model).

## Output

Short summary: decisions made, open items, suggested next step (table above).
