# Homelab issue ledger

In-repo backlog for gaps, bugs, and desired state. Chat is not the backlog.
Git history is the archive.

## Layout

Flat directory — no `open/` or `closed/` folders:

```
docs/issues/
  README.md       # this file
  _template.md    # copy when filing
  <slug>.md       # one issue per file
```

Slug is `kebab-case` and names the gap, not the date
(e.g. `flux-notready-games-kustomization.md`).

## Issues vs plans

| Surface        | Holds                                                         |
| -------------- | ------------------------------------------------------------- |
| `docs/issues/` | **What** — problem / desired state, acceptance, feedback loop |
| Plans          | **How** — steps, checkboxes, implementation detail            |

Plans are forthcoming. Until `docs/plans/` exists, use
[project-planner](../../.agents/agents/project-planner/agent.md) and write living
plans under [`.cursor/plans/`](../../.cursor/plans/README.md). Do not bury a
full plan inside an issue — link it via optional `plan:` frontmatter when you
have one.

## Status and lifecycle

Status lives in YAML frontmatter only (`open` | `in-flight` | `blocked` |
`closed` | `wontfix` | `superseded` | `promoted`).

**Delete-on-ship:** when acceptance is met in the same change that ships the
fix, delete the issue file. Do not keep a `closed/` tree. Git history is the
archive. Optional `closed_by:` (MR / commit SHA) is fine while the file still
exists during review; it goes away with the file.

## Filing rules

| Situation                               | Action                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Fixable in the current branch / lap     | Fix it; do not file                                                                             |
| Real gap, not fixing now                | File an issue from `_template.md`                                                               |
| Duplicate of an existing issue          | Update the existing file; do not create a second                                                |
| Single `ponytail:` shortcut             | Comment in code — not an issue                                                                  |
| Clustered related `ponytail:` debt      | One issue covering the theme                                                                    |
| Scope fuzzy / multiple valid approaches | Run [alignment](../../.agents/skills/alignment/SKILL.md) first; file after shared understanding |

Agents file **locally** under this directory by default. Do **not** create
GitLab issues unless the operator asks. When an issue is promoted for human
visibility, set optional `gitlab:` to the URL and leave the local file in place
until delete-on-ship (or mark `promoted` if that is the handoff).

Filing procedure for agents:
[file-issue](../../.agents/skills/file-issue/SKILL.md) (this README is the
conventions SoT).

## Homelab constraints

- **No secrets in issue bodies.** Reference 1Password Item names / vault paths
  only — never tokens, passwords, kubeconfigs, or `.env` contents.
- **Cluster incidents** may be filed with evidence (Flux object names, alert
  names, log excerpts without secrets). Filing does not authorize mutate —
  `kubectl apply`, `flux reconcile`, and other live changes still need
  operator permission.
- Agents never `git commit`. Operator commits.

## Frontmatter

Required:

| Field      | Values                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `title`    | Short human title                                                                                 |
| `kind`     | `bug` \| `feature` \| `spec` \| `architecture`                                                    |
| `status`   | `open` \| `in-flight` \| `blocked` \| `closed` \| `wontfix` \| `superseded` \| `promoted`         |
| `severity` | `low` \| `medium` \| `high` \| `blocker`                                                          |
| `source`   | `agent` \| `human` \| `dogfood` \| `review` \| `architecture-review` \| `alert` \| `flux` \| `ci` |
| `found_at` | `YYYY-MM-DD`                                                                                      |

Optional:

| Field       | Notes                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `found_by`  | Agent or human id                                                                                               |
| `area`      | `flux` \| `helm` \| `talos` \| `observability` \| `security` \| `apps` \| `networking` \| `storage` \| `agents` |
| `slice`     | `afk` (unattended-safe) \| `hitl` (needs human)                                                                 |
| `plan`      | Path to living plan (`.cursor/plans/…` or later `docs/plans/…`)                                                 |
| `gitlab`    | URL when promoted                                                                                               |
| `branch`    | Work branch when `in-flight`                                                                                    |
| `closed_by` | MR / commit while still on disk                                                                                 |

## Body sections

Copy from [`_template.md`](./_template.md):

1. Problem / desired state
2. Repro (bugs; omit or N/A otherwise)
3. Acceptance
4. Feedback loop — name the verify commands (e.g. `kustomize build`,
   `helm template`, `yamllint`, Trivy on changed paths, Flux MCP read-only
   checks). If you cannot name a loop, run alignment first.
5. Implementation hint — light pointer, not a plan
6. Notes

## Related

- [file-issue](../../.agents/skills/file-issue/SKILL.md) — file / update / delete-on-ship
- [alignment](../../.agents/skills/alignment/SKILL.md) — fuzzy scope before filing
- [project-planner](../../.agents/agents/project-planner/agent.md) — how / plans
- [reconcile-context](../../.agents/skills/reconcile-context/SKILL.md) — agent context drift after behavior moves
