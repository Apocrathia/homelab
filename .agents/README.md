# `.agents/`

Portable agent configuration for this repo, aligned with the
[.agents Protocol](https://dotagentsprotocol.com/) directory layout
(`skills/`, `agents/`, `rules/`, `memories/`). Root [`AGENTS.md`](../AGENTS.md)
is the router ([`CLAUDE.md`](../CLAUDE.md) is a symlink to it). Harness
adapters:

- [`.cursor/`](../.cursor/README.md) — Cursor rules discovery, hooks, commands
- [`.claude/`](../.claude/README.md) — Claude Code discovery symlinks
- [`.prime/agent/`](../.prime/agent/) — Prime Agent prompt surface: generated
  `APPEND_SYSTEM.md` (always-on rules) via
  [`sync_surfaces.py`](./skills/reconcile-context/scripts/sync_surfaces.py);
  skills discovered natively from [`skills/`](./skills/)

## Layout

| Path                                | Role                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| [`context/`](./context/README.md)   | Project context modules; read via the routing table, not by dumping the folder |
| [`skills/`](./skills/)              | Procedural skills (`SKILL.md` per skill; Anthropic/Cursor skill filename)      |
| [`agents/`](./agents/)              | Sub-agent personas (`<id>/agent.md` per the protocol)                          |
| [`rules/`](./rules/README.md)       | All agent rules — behavioral + domain (Cursor discovers via `.mdc` symlinks)   |
| [`memories/`](./memories/README.md) | Durable lessons across sessions                                                |

Do not invent parallel trees under vendor dirs. Harness adapters
(`.cursor/`, `.claude/`) are **discovery-only** — edit bodies here, never copy
them into the adapters. When adding a skill or persona, wire the Cursor
symlinks (and Claude per-persona agent links); Claude skills auto-discover via
the `.claude/skills` directory symlink. All rules — behavioral and domain
(Flux, Helm, Talos, …) — live under `rules/` here, with `.mdc` symlinks in
`.cursor/rules/`.

Discovery parity:
[`skills/reconcile-context/scripts/check_discovery.py`](./skills/reconcile-context/scripts/check_discovery.py);
generated harness surfaces (`.prime/agent/APPEND_SYSTEM.md`):
[`sync_surfaces.py --check`](./skills/reconcile-context/scripts/sync_surfaces.py)
(both via [`reconcile-context`](./skills/reconcile-context/SKILL.md)). Harness
ownership of each surface is declared in `rules|agents|skills/_harnesses.json`
sidecars.

## Loading

Follow the routing table in [`AGENTS.md`](../AGENTS.md). For what to skip, see
[`context/loading.md`](./context/loading.md). Keep context modules thin; link
into `docs/` and manifests instead of copying tunable values. Agent backlog
lives under [`docs/issues/`](../docs/issues/README.md). Rank next work with
[`find-work`](./skills/find-work/SKILL.md) and
[`context/development-loop.md`](./context/development-loop.md). Unattended laps
use [`run-loop`](./skills/run-loop/SKILL.md); open-MR maintenance uses
[`watch-mr`](./skills/watch-mr/SKILL.md). Idle research uses
[`autoresearch`](./skills/autoresearch/SKILL.md) and
[`docs/research/`](../docs/research/README.md).
