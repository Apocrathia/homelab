# `.cursor/` — Cursor adapter

Cursor-specific surfaces for this repo. **Portable agent config** (skills,
personas, context, behavioral rules, memories) lives under
[`.agents/`](../.agents/README.md). Root [`AGENTS.md`](../AGENTS.md) is the
router.

`skills/` and `agents/` here are **symlinks** into `.agents/`. Behavioral
rules under `rules/` are **per-file `.mdc` symlinks** into `.agents/rules/*.md`;
domain GitOps rules are real `.mdc` files here. Edit the `.agents/` target for
portable content, not a copy.

## Subdirectories

| Path        | What it holds                               | Notes                                      |
| ----------- | ------------------------------------------- | ------------------------------------------ |
| `rules/`    | Domain `.mdc` + symlinks → `.agents/rules/` | [rules/README.md](./rules/README.md)       |
| `skills/`   | Symlinks → `.agents/skills/`                | [skills/README.md](./skills/README.md)     |
| `agents/`   | Symlinks → `.agents/agents/*/agent.md`      | [agents/README.md](./agents/README.md)     |
| `commands/` | Slash commands                              | [commands/README.md](./commands/README.md) |
| `memories/` | Symlink README → `.agents/memories/`        | Content under `.agents/memories/`          |
| `plans/`    | Living plans from project-planner           | Still Cursor-local for now                 |
| `hooks/`    | Lifecycle guards                            | [hooks/README.md](./hooks/README.md)       |

## Adding content

- **Portable skills / personas / context / behavioral rules / memories:** add
  under `.agents/`, then symlink from here if Cursor should auto-discover it.
- **Domain rules / hooks / commands:** add under `.cursor/` and update the
  matching README.
