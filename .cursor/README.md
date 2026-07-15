# `.cursor/` — Cursor adapter

Cursor-specific surfaces for this repo. **Portable agent config** (skills,
personas, context, memories) lives under [`.agents/`](../.agents/README.md).
Root [`AGENTS.md`](../AGENTS.md) is the router.

`skills/` and `agents/` here are **symlinks** into `.agents/` so Cursor can
discover them. Edit the `.agents/` target, not a copy.

## Subdirectories

| Path        | What it holds                                  | Notes                                               |
| ----------- | ---------------------------------------------- | --------------------------------------------------- |
| `rules/`    | `.mdc` rules (always-on / globs / requestable) | Cursor-native; [rules/README.md](./rules/README.md) |
| `skills/`   | Symlinks → `.agents/skills/`                   | [skills/README.md](./skills/README.md)              |
| `agents/`   | Symlinks → `.agents/agents/*/agent.md`         | [agents/README.md](./agents/README.md)              |
| `commands/` | Slash commands                                 | [commands/README.md](./commands/README.md)          |
| `memories/` | Symlink README → `.agents/memories/`           | Content under `.agents/memories/`                   |
| `plans/`    | Living plans from project-planner              | Still Cursor-local for now                          |
| `hooks/`    | Lifecycle guards                               | [hooks/README.md](./hooks/README.md)                |

## Adding content

- **Portable skills / personas / context / memories:** add under `.agents/`, then
  symlink from here if Cursor should auto-discover it.
- **Rules / hooks / commands:** add under `.cursor/` and update the matching README.
