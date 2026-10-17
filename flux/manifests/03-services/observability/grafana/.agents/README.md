# `.agents/` — Grafana module

Portable agent configuration scoped to this folder, following the same
[.agents Protocol](https://dotagentsprotocol.com/) layout as the repo root
[`.agents/`](../../../../../../.agents/README.md). This module travels with the
Grafana manifests so agents landing here get instance facts and tooling
instructions without repo-root context.

| Path      | Role                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/` | 24 gcx workflow skills vendored byte-identical from upstream + the hand-authored `grafana-homelab` state skill — see [`skills/README.md`](./skills/README.md) |

## Loading

Read [`../AGENTS.md`](../AGENTS.md) first, then the skill a task needs. Tool
installation instructions (gcx + its bundled skills) live in
[`../AGENTS.md`](../AGENTS.md); instance state and credential architecture
live in [`skills/grafana-homelab/SKILL.md`](./skills/grafana-homelab/SKILL.md).
