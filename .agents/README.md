# `.agents/`

Portable agent configuration for this repo, aligned with the
[.agents Protocol](https://dotagentsprotocol.com/) directory layout
(`skills/`, `agents/`, `rules/`, `memories/`). Root [`AGENTS.md`](../AGENTS.md)
is the router ([`CLAUDE.md`](../CLAUDE.md) is a symlink to it). Harness
adapters:

- [`.cursor/`](../.cursor/README.md) — Cursor rules discovery, hooks, commands
- [`.claude/`](../.claude/README.md) — Claude Code discovery symlinks

## Layout

| Path                                | Role                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| [`context/`](./context/README.md)   | Project context modules; read via the routing table, not by dumping the folder |
| [`skills/`](./skills/)              | Procedural skills (`SKILL.md` per skill; Anthropic/Cursor skill filename)      |
| [`agents/`](./agents/)              | Sub-agent personas (`<id>/agent.md` per the protocol)                          |
| [`rules/`](./rules/README.md)       | Portable behavioral Markdown rules (Cursor discovers via `.mdc` symlinks)      |
| [`memories/`](./memories/README.md) | Durable lessons across sessions                                                |

Do not invent parallel trees under vendor dirs. Cursor and Claude discover
skills and personas through thin symlinks; the files here are the source of
truth. Domain GitOps rules (Flux, Helm, Talos, …) stay under `.cursor/rules/`
as real files.

## Loading

Follow the routing table in [`AGENTS.md`](../AGENTS.md). For what to skip, see
[`context/loading.md`](./context/loading.md). Keep context modules thin; link
into `docs/` and manifests instead of copying tunable values. Agent backlog
lives under [`docs/issues/`](../docs/issues/README.md).

Drift checks: [`skills/reconcile-context/SKILL.md`](./skills/reconcile-context/SKILL.md).
