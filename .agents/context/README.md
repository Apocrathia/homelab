# `.agents/context/`

Sixty-second model of this repository, plus the map of context modules. Full
stack story: [`README.md`](../../README.md). Start here, then open the module
your task needs ([`loading.md`](./loading.md) for load vs skip).

## What this is

A home Kubernetes cluster on Talos, managed with Flux GitOps. Manifests in
`flux/` are the source of truth for tunable config. Fun, learning, and fewer
manual chores. Not a fake enterprise platform.

## Shape of the tree

| Area              | What lives there                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `talos/`          | Node OS / machine config                                                                       |
| `flux/manifests/` | Cluster workloads and bootstrap (GitOps)                                                       |
| `helm/`           | Charts (including shared `generic-app`)                                                        |
| `terraform/`      | OpenTofu/Terragrunt for Proxmox VMs and related infra                                          |
| `fleet/`          | Fleet DM GitOps YAML (org settings, policies; applied via `fleetctl gitops` CI)                |
| `secrets/`        | Local operator secrets (gitignored credentials; not GitOps CRs)                                |
| `scripts/`        | Operator helper scripts                                                                        |
| `docs/`           | Human docs + agent ledgers (`issues/`, `plans/`, `research/`); no tunable limits/versions here |
| `.gitlab/`        | GitLab CI/CD pipelines and related config                                                      |
| `.agents/`        | Portable agent config (this tree)                                                              |
| `.cursor/`        | Cursor adapter: rules, hooks, slash commands, discovery symlinks                               |
| `.claude/`        | Claude Code adapter: discovery symlinks                                                        |
| `.scratch/`       | Throwaway renders and dumps (gitignored)                                                       |
| `.worktrees/`     | Linked git worktrees for agent edits (gitignored; see [`worktrees.md`](../rules/worktrees.md)) |

## How agents should behave here

Permissions and hard stops: root [`AGENTS.md`](../../AGENTS.md) and
[`constraints.md`](./constraints.md). Tone (yes, including profanity):
[`voice.md`](./voice.md). Domain detail is in [`../rules/`](../rules/README.md)
(Flux, Helm, Talos, secrets) — Cursor glob-loads it via `.mdc` symlinks; other
agents should still follow the constraints and the skill they invoked.

## Modules

Reconcile this inventory when adding or removing modules
([`reconcile-context`](../skills/reconcile-context/SKILL.md)).

| File                                           | Purpose                           | If wrong                                  |
| ---------------------------------------------- | --------------------------------- | ----------------------------------------- |
| [`README.md`](./README.md)                     | Hub: orientation + this map       | Agents miss the entrypoint                |
| [`loading.md`](./loading.md)                   | Load vs skip                      | Context bloat or missing cues             |
| [`constraints.md`](./constraints.md)           | Non-negotiables                   | Unsafe cluster or GitOps behavior         |
| [`traps.md`](./traps.md)                       | Recurring footguns                | Repeat known failures                     |
| [`nomenclature.md`](./nomenclature.md)         | Naming vocabulary                 | Inconsistent resource / path names        |
| [`tools.md`](./tools.md)                       | MCP and CLI preferences           | Wrong tool, noisy ops                     |
| [`questions.md`](./questions.md)               | How to ask the operator           | Markdown question walls / guessing        |
| [`voice.md`](./voice.md)                       | Chat tone + doc prose             | Sterile or fake-corporate agents          |
| [`output.md`](./output.md)                     | How agents structure replies      | Unreadable dump replies                   |
| [`development-loop.md`](./development-loop.md) | Find → rank → Launch brief → ship | Agents invent busywork or skip stop gates |
| [`vertical-slices.md`](./vertical-slices.md)   | How to size plans / briefs / MRs  | Horizontal layer dumps                    |
| [`learning-loop.md`](./learning-loop.md)       | Patterns → rules → enforcement    | Lessons lost; no promotion path           |
| [`enforcement.md`](./enforcement.md)           | Hooks/CI over hope                | Rules without mechanical teeth            |

This README is excluded from "must appear in every routing row"; it is the map.

## Living context

When the repo changes in a way that makes a module wrong, update the module in
the same change. If you spot drift you cannot fix now, leave an HTML comment:

```html
<!-- drift: short note about what moved -->
```

Stale context text is worse than none: it is confidently wrong. Use
[`reconcile-context`](../skills/reconcile-context/SKILL.md) to sync.
