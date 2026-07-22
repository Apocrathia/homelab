---
name: file-issue
description: >-
  Create or update local issues under docs/issues/; use when filing a gap out
  of scope for the current change.
disable-model-invocation: true
---

# File issue

Record a problem or desired state under [`docs/issues/`](../../../docs/issues/).
Issues define **what**; plans define **how**. Plans live under
[`docs/plans/`](../../../docs/plans/) (and optionally
[`.cursor/plans/`](../../../.cursor/plans/) for IDE-only sessions) via
[`project-planner`](../../agents/project-planner/agent.md). Do not invent a
plan in the issue body.

Do **not** create GitLab issues unless the operator explicitly asks. Local
`docs/issues/` is the default backlog.

Question channel when acceptance is fuzzy:
[`.agents/context/questions.md`](../../context/questions.md).

## When to file

| Situation                                           | Action                                                |
| --------------------------------------------------- | ----------------------------------------------------- |
| Fixable in the current change                       | Fix it — no issue                                     |
| Out of scope for current change                     | File (or update duplicate)                            |
| Duplicate of an existing open issue                 | Update that file                                      |
| Feature / spec / multi-path bug; acceptance unclear | [`alignment`](../alignment/SKILL.md) first, then file |
| Single intentional shortcut                         | `ponytail:` in code, not here                         |
| Clustered `ponytail:` debt (a theme)                | File one issue for the theme                          |
| Architecture friction                               | File with `kind: architecture`                        |

## Workflow

```
- [ ] 1. Search docs/issues/*.md for duplicates (skip README, _template)
- [ ] 2. Duplicate → update that file; skip to step 5
- [ ] 3. Else copy docs/issues/_template.md → docs/issues/<short-slug>.md
- [ ] 4. Fill frontmatter + body (include Feedback loop)
- [ ] 5. Report the path to the operator
```

Template: [`docs/issues/_template.md`](../../../docs/issues/_template.md).
Conventions: [`docs/issues/README.md`](../../../docs/issues/README.md).

## Frontmatter

Match [`docs/issues/_template.md`](../../../docs/issues/_template.md):

| Field      | Notes                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `title`    | Short title                                                                                                          |
| `kind`     | `bug` \| `feature` \| `spec` \| `architecture`                                                                       |
| `status`   | `open` \| `in-flight` \| `blocked` \| `closed` \| `wontfix` \| `superseded` \| `promoted`                            |
| `severity` | `blocker` \| `high` \| `medium` \| `low`                                                                             |
| `source`   | e.g. `agent` \| `human` \| `dogfood` \| `review` \| `alert` \| `flux` \| `ci`                                        |
| `found_at` | `YYYY-MM-DD`                                                                                                         |
| `found_by` | Optional                                                                                                             |
| `area`     | e.g. `flux` \| `helm` \| `talos` \| `observability` \| `security` \| `apps` \| `networking` \| `storage` \| `agents` |
| `slice`    | Optional: `afk` \| `hitl`                                                                                            |
| `plan`     | Optional path (`docs/plans/…` preferred; `.cursor/plans/…` for IDE-only)                                             |
| `gitlab`   | Optional URL when operator-promoted                                                                                  |
| `branch`   | Optional when `in-flight`                                                                                            |

Body must include **Feedback loop** (how to know acceptance is met without
reading the full diff). Bugs: repro encouraged, not mandatory.

## Closure

When acceptance is met, **delete** `docs/issues/<slug>.md` in the same change
set as the fix, and fix backlinks in linked plans/docs.

`reconcile-docs` does not exist yet — parent agent or operator owns closure
until that skill lands. Do not leave satisfied issue files around.

## Homelab constraints

- Never `git commit` / push (operator commits).
- Never put secrets or credential material in issue bodies.
- Never cluster-mutate as part of filing (`kubectl apply`, `flux reconcile`,
  mutating MCP, etc.).
