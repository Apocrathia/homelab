---
name: architecture-review
description: >-
  Explore the codebase for architectural friction (shallow modules, coupling,
  test gaps) and file local markdown issues under docs/issues/. Use when
  improving codebase shape, before large refactors, or when find-work should
  surface design-debt issues.
disable-model-invocation: true
---

# Architecture review

Read-only exploration that ends in **filed local issues**, not code changes in
this session. Deep modules, boundary tests, ports and adapters.

Homelab constraints still apply
([`constraints.md`](../../context/constraints.md)). Do not propose changes that
bypass GitOps truth, Gateway API, or 1Password Item CRs.

## Deliverable

One or more issues under `docs/issues/<slug>.md` (`kind: architecture` in
frontmatter), each with **Problem**, **Acceptance**, and **Feedback loop**.
Filing is its own lap: [`file-issue`](../file-issue/SKILL.md) →
[`review-loop`](../review-loop/SKILL.md) →
[`draft-commit`](../draft-commit/SKILL.md) when authorized.

[`find-work`](../find-work/SKILL.md) may rank architecture-review briefs when
scouts surface coupling themes or untested seams.

## Workflow

```
- [ ] 1. Orient: AGENTS.md routing, constraints.md, relevant tree
- [ ] 2. Explore (read-only): parent or explore Task — note friction
- [ ] 3. Present numbered candidates (clusters, coupling, test impact)
- [ ] 4. Operator picks candidates (or rank-1 when autonomous lap authorized)
- [ ] 5. For each pick: problem space + interface sketch (chat); no code yet
- [ ] 6. Write issue file(s) from docs/issues/_template.md
- [ ] 7. Hand off file-issue / draft-commit path
```

## What to look for

- Shallow modules: interface nearly as large as implementation
- Bouncing across many files to understand one concept
- Pure helpers extracted only for testability while integration seams stay bare
- Tightly coupled charts/manifests/scripts with no validation boundary
- Untested controller, gateway, restore, or deploy paths

Friction you hit while exploring **is** the signal.

## Issue content (per candidate)

- **Problem** — modules involved, coupling, integration risk
- **Proposed direction** — interface sketch, what complexity moves behind a boundary
- **Dependency strategy** — in-process | local-substitutable | ports/adapters | external mock
- **Feedback loop** — boundary test, render check, or dogfood step that proves the refactor
- **Testing strategy** — new checks; shallow tests to delete after

Do not paste a full plan; link a plan later via [`project-planner`](../../agents/project-planner/agent.md) if needed.

## Subagents

| Step        | Agent                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Explore     | `explore` Task or parent reads                                                                        |
| File        | parent or `file-issue`                                                                                |
| Deep design | [`project-planner`](../../agents/project-planner/agent.md) after alignment if the issue spawns a plan |

## Do not

- Edit production manifests or app code in this skill (exploration until issues are filed)
- Open GitLab issues unless the operator directs
- File vague "refactor X" without a named feedback loop
- Require worktrees or branches — this repo usually works in the workspace root
