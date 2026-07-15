# `.claude/` — Claude Code adapter

Claude Code reads [`CLAUDE.md`](../CLAUDE.md) (symlink to [`AGENTS.md`](../AGENTS.md))
and discovers skills/agents under this directory. **Source of truth** is
[`.agents/`](../.agents/README.md). Edit there; these are discovery symlinks.

| Path          | Target                                               |
| ------------- | ---------------------------------------------------- |
| `skills/`     | [`.agents/skills/`](../.agents/skills/)              |
| `agents/*.md` | [`.agents/agents/<id>/agent.md`](../.agents/agents/) |

Cursor adapter: [`.cursor/README.md`](../.cursor/README.md). Lab context hub:
[`.agents/context/README.md`](../.agents/context/README.md).
