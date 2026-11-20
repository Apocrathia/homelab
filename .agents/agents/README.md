# `.agents/agents/`: sub-agent personas

One directory per persona, each a single `agent.md` charter (frontmatter
`name` / `description`, then identity, scope, and process). The persona table
in `.agents/rules/subagents.md` routes work here; `AGENTS.md` links the rows.
`_harnesses.json` keeps mirrors off: Claude discovers personas through
per-file symlinks under `.claude/agents/`, Prime Agent through `rlm()`
sub-agent tasks.

> **Navigation**: [← Back to .agents README](../README.md)
