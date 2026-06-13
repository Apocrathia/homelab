# `.cursor/skills/` — Project-specific procedural skills

Skills are step-by-step procedures for recurring tasks specific to this project. Cursor discovers them from `skill-name/SKILL.md` with YAML frontmatter (`name`, `description`) and may auto-invoke when a task matches the description.

For general-purpose skills (debugging, brainstorming, code review), use the global skill system in `~/.cursor/skills/` and bundled `cursor-public` plugins. This directory is for skills tied to this homelab.

## When to write a skill

- A procedure recurs and has multiple steps that should be done in order.
- The steps involve project-specific tools, paths, or conventions.
- Getting the order wrong has consequences (broken state, wasted time, partial deploys).

If the procedure is one or two commands, document it in a rule or a README instead.

## File convention

```
.cursor/skills/<skill-name>/SKILL.md
```

Required frontmatter:

```yaml
---
name: skill-name
description: What the skill does and when to use it (third person, include trigger terms)
---
```

Suggested body sections:

- **Purpose** — what this skill accomplishes
- **When to use** — triggers, prerequisites
- **Steps** — numbered, executable, with the exact commands
- **Verification** — how to confirm the skill worked
- **Rollback** — how to undo if it didn't

Optional supporting files (`reference.md`, `examples.md`, `scripts/`) live in the same directory. Keep `SKILL.md` under 500 lines; link out for detail.

## Current skills

| Skill                           | Path                                                                               | Purpose                                                                                              | Triggers                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `helm-deployment`               | [helm-deployment/SKILL.md](./helm-deployment/SKILL.md)                             | Deploy a Helm chart end-to-end: chart review, HelmRelease config, Authentik integration, post-deploy | Adding a new app via Helm; updating an existing HelmRelease's structure         |
| `mcp-deployment`                | [mcp-deployment/SKILL.md](./mcp-deployment/SKILL.md)                               | Deploy an MCP server via ToolHive and wire it into LiteLLM                                           | Adding a new MCP server under `flux/manifests/04-apps/artificial-intelligence/` |
| `cnpg-logical-database-restore` | [cnpg-logical-database-restore/SKILL.md](./cnpg-logical-database-restore/SKILL.md) | Logical CNPG restore: suspend Flux → `cnpg-data-extract` → fresh `Cluster` → `cnpg-data-restore`     | Restoring or migrating a CNPG database via `pg_dump`/`pg_restore`               |
| `generic-app-longhorn-restore`  | [generic-app-longhorn-restore/SKILL.md](./generic-app-longhorn-restore/SKILL.md)   | Restore a Longhorn-backed volume for a `generic-app` workload via `helm template` PV/PVC re-render   | Recovering a faulted/missing Longhorn volume for a `generic-app` deployment     |
