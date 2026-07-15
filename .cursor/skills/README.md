# `.cursor/skills/` — Cursor discovery for skills

Canonical skill bodies live under [`.agents/skills/`](../../.agents/skills/).
Each entry here is a symlink so Cursor can index `SKILL.md` frontmatter.

For when to write a skill and frontmatter conventions, see
[`.agents/README.md`](../../.agents/README.md) and any existing `SKILL.md`.

## Current skills

| Skill                           | SoT                                                                                                           | Purpose                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `alignment`                     | [`.agents/skills/alignment`](../../.agents/skills/alignment/SKILL.md)                                         | Grill-me interview until scope is shared  |
| `helm-deployment`               | [`.agents/skills/helm-deployment`](../../.agents/skills/helm-deployment/SKILL.md)                             | Deploy Helm/Flux apps end-to-end          |
| `mcp-deployment`                | [`.agents/skills/mcp-deployment`](../../.agents/skills/mcp-deployment/SKILL.md)                               | ToolHive MCP → LiteLLM                    |
| `cnpg-logical-database-restore` | [`.agents/skills/cnpg-logical-database-restore`](../../.agents/skills/cnpg-logical-database-restore/SKILL.md) | CNPG logical dump/restore                 |
| `generic-app-longhorn-restore`  | [`.agents/skills/generic-app-longhorn-restore`](../../.agents/skills/generic-app-longhorn-restore/SKILL.md)   | Longhorn restore for generic-app          |
| `reconcile-context`             | [`.agents/skills/reconcile-context`](../../.agents/skills/reconcile-context/SKILL.md)                         | Sync AGENTS.md + `.agents/context/` drift |
