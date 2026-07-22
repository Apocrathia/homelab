# `.claude/` — Claude Code adapter

Claude Code reads [`CLAUDE.md`](../CLAUDE.md) (symlink to [`AGENTS.md`](../AGENTS.md))
and discovers skills/agents under this directory.

**Source of truth:** edit under [`.agents/`](../.agents/README.md) only. Never
copy skill or persona bodies into `.claude/`. This tree is discovery symlinks.

| Path          | Target                                               |
| ------------- | ---------------------------------------------------- |
| `skills/`     | [`.agents/skills/`](../.agents/skills/)              |
| `agents/*.md` | [`.agents/agents/<id>/agent.md`](../.agents/agents/) |
| `CLAUDE.md`   | [`AGENTS.md`](../AGENTS.md) (repo root)              |

## Adding a persona

1. Create [`.agents/agents/<id>/agent.md`](../.agents/agents/).
2. Symlink here:
   `ln -s ../../.agents/agents/<id>/agent.md .claude/agents/<id>.md`
3. Add the matching Cursor symlink and table row — see
   [`.cursor/agents/README.md`](../.cursor/agents/README.md).

## Adding a skill

Create under [`.agents/skills/<id>/`](../.agents/skills/). Claude picks it up
via the `skills/` directory symlink — no per-skill link here.

Cursor still needs a per-skill symlink + README row — see
[`.cursor/skills/README.md`](../.cursor/skills/README.md).

## Rules

Claude does **not** use a `.claude/rules` tree. Behavioral core arrives via
`CLAUDE.md` → `AGENTS.md` (and links into [`.agents/rules/`](../.agents/rules/)).
Portable rules SoT stays `.agents/rules/*.md`. Cursor-only `.mdc` discovery is
under [`.cursor/rules/`](../.cursor/rules/). Do not invent Claude rules
discovery.

## Parity

Verify discovery links with the
[`reconcile-context`](../.agents/skills/reconcile-context/SKILL.md) skill and
[`check_discovery.py`](../.agents/skills/reconcile-context/scripts/check_discovery.py).

Cursor adapter: [`.cursor/README.md`](../.cursor/README.md). Lab context hub:
[`.agents/context/README.md`](../.agents/context/README.md).
