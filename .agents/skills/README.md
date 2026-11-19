# `.agents/skills/` — procedural skills

One directory per skill with a `SKILL.md` (frontmatter `name` /
`description`, then the workflow body). Skills may add `scripts/`,
`references/`, or `templates/` beside it. `_harnesses.json` keeps mirrors off
— Claude discovers skills through the `.claude/skills` symlink, Prime Agent
reads this tree natively.

> **Navigation**: [← Back to .agents README](../README.md)
