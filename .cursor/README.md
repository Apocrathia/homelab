# `.cursor/` — Cursor adapter

Cursor-specific surfaces for this repo. **Portable agent config** (skills,
personas, context, behavioral rules, memories) lives under
[`.agents/`](../.agents/README.md). Root [`AGENTS.md`](../AGENTS.md) is the
router.

**SoT-edit rule:** edit under `.agents/` for portable skills, personas, rules,
memories, and context. Never duplicate those bodies under `.cursor/`. This tree
holds discovery symlinks (plus Cursor-only domain rules, hooks, commands,
plans).

`skills/` and `agents/` here are **symlinks** into `.agents/`. Behavioral
rules under `rules/` are **per-file `.mdc` symlinks** into `.agents/rules/*.md`;
domain GitOps rules are real `.mdc` files here.

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

## Adding a skill

1. Create under `.agents/skills/<id>/`.
2. Symlink: `ln -s ../../.agents/skills/<id> .cursor/skills/<id>`
3. Update [skills/README.md](./skills/README.md).

Claude gets skills via the `.claude/skills` directory symlink — no per-skill
Claude link. See [`.claude/README.md`](../.claude/README.md).

## Adding a persona

1. Create under `.agents/agents/<id>/agent.md`.
2. Symlink both adapters:
   - `ln -s ../../.agents/agents/<id>/agent.md .cursor/agents/<id>.md`
   - `ln -s ../../.agents/agents/<id>/agent.md .claude/agents/<id>.md`
3. Update [agents/README.md](./agents/README.md) (and Claude README if it lists
   personas by name).

## Adding other content

- **Portable context / behavioral rules / memories:** add under `.agents/`, then
  symlink from here if Cursor should auto-discover it.
- **Domain rules / hooks / commands:** add under `.cursor/` and update the
  matching README.

## Parity

Verify discovery links with
[`reconcile-context`](../.agents/skills/reconcile-context/SKILL.md) /
[`check_discovery.py`](../.agents/skills/reconcile-context/scripts/check_discovery.py).
