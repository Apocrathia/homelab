# `.agents/` — Fleet module

Portable agent configuration scoped to this folder, following the same
[.agents Protocol](https://dotagentsprotocol.com/) layout as the repo root
[`.agents/`](../../.agents/README.md). This module travels with the Fleet
GitOps tree so agents landing here get the GitOps workflow, tree conventions,
and validation tooling without repo-root context.

| Path      | Role                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/` | The vendored `fleet-gitops` skill, from [github.com/fleetdm/fleet](https://github.com/fleetdm/fleet) — see [`skills/README.md`](./skills/README.md) |

## Loading

Read [`../AGENTS.md`](../AGENTS.md) first, then the skill a task needs. The
GitOps workflow, tree conventions, and the pre-merge validation ladder live in
[`skills/fleet-gitops/SKILL.md`](./skills/fleet-gitops/SKILL.md).
