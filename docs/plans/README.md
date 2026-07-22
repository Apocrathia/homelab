# Homelab plan ledger

In-repo living plans for multi-session how-work. Chat is not the plan.
Git history is the archive.

## Plans vs issues

| Surface        | Holds                                                         |
| -------------- | ------------------------------------------------------------- |
| `docs/issues/` | **What** — problem / desired state, acceptance, feedback loop |
| `docs/plans/`  | **How** — steps, checkboxes, decisions, implementation detail |

Do not bury a full plan inside an issue — link it via optional `plan:`
frontmatter on the issue. Do not invent acceptance criteria here that belong
on the issue; keep the issue as the desired-state SoT when one exists.

## Layout

Flat directory — no `open/` or `closed/` folders:

```
docs/plans/
  README.md       # this file
  _template.md    # copy when authoring
  <slug>.md       # one plan per file
```

Slug is `kebab-case` and names the work, not the date
(e.g. `migrate-immich-to-cnpg.md`). Skip `README.md` and `_template.md` when
enumerating plans (same rule as issues).

## Dual surface

| Surface          | Role                                                                               |
| ---------------- | ---------------------------------------------------------------------------------- |
| `docs/plans/`    | Durable / agent-loop SoT — prefer for find-work, multi-session, and GitOps handoff |
| `.cursor/plans/` | Cursor IDE interactive planning — fine for IDE-only sessions                       |

Prefer [`docs/plans/`](./) when the plan must survive chats and feed the
development loop. [`.cursor/plans/`](../../.cursor/plans/README.md) remains
valid for Cursor-native planning UI sessions. When ambiguous, ask the operator
which surface to use.

Authoring persona:
[project-planner](../../.agents/agents/project-planner/agent.md).

## Status and lifecycle

Status lives in YAML frontmatter only (`draft` | `active` | `blocked` |
`done`).

Plans are **living documents**: update checkboxes and decisions as work
progresses. A stale plan is worse than no plan.

**Delete-on-ship:** when acceptance on the related issue (or the plan's own
done criteria) is met in the same change that ships the work, delete the plan
file. Do not keep a `closed/` tree. Git history is the archive.

## Authoring rules

| Situation                            | Action                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Light / obvious change               | Skip the plan doc; chat checklist is enough                                              |
| Multi-step or multi-session how-work | Copy `_template.md` → `docs/plans/<slug>.md` (or `.cursor/plans/` for IDE-only)          |
| Related issue exists                 | Set optional `related_issue:` to that path; keep what/how split                          |
| Duplicate of an existing plan        | Update the existing file; do not create a second                                         |
| Scope fuzzy / multiple approaches    | Run [alignment](../../.agents/skills/alignment/SKILL.md) first; plan after shared intent |

Agents write **locally** under this directory by default for durable plans. Do
**not** invent Wave 4 loop skills here — follow
[development-loop](../../.agents/context/development-loop.md) and
project-planner.

## Homelab constraints

- **No secrets in plan bodies.** Reference 1Password Item names / vault paths
  only — never tokens, passwords, kubeconfigs, or `.env` contents.
- Plans that imply cluster mutation still need operator permission at
  execution time — planning is not authorize-to-mutate.
- Agents never `git commit`. Operator commits.

## Frontmatter

Required:

| Field        | Values                                     |
| ------------ | ------------------------------------------ |
| `title`      | Short human title                          |
| `status`     | `draft` \| `active` \| `blocked` \| `done` |
| `found_at`   | `YYYY-MM-DD`                               |
| `updated_at` | `YYYY-MM-DD`                               |

Optional:

| Field           | Notes                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `related_issue` | Path to `docs/issues/<slug>.md` when how-work is tied to a gap                                                  |
| `area`          | `flux` \| `helm` \| `talos` \| `observability` \| `security` \| `apps` \| `networking` \| `storage` \| `agents` |

**Feedback loop** is required in the body (not frontmatter): name the verify
commands. If you cannot name a loop, run alignment first.

## Body sections

Copy from [`_template.md`](./_template.md):

1. Goal
2. Scope (in / out)
3. Decisions
4. Steps — living checkboxes
5. Feedback loop — named verify commands (e.g. `kustomize build`,
   `helm template`, `yamllint`, Trivy on changed paths, Flux MCP read-only
   checks)
6. Notes

## Related

- [`_template.md`](./_template.md) — copy when authoring
- [project-planner](../../.agents/agents/project-planner/agent.md) — plan authoring persona
- [docs/issues/](../issues/README.md) — what / desired state
- [`.cursor/plans/`](../../.cursor/plans/README.md) — Cursor IDE interactive surface
- [development-loop](../../.agents/context/development-loop.md) — find → plan → ship
