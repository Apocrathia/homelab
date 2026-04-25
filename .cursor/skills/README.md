# `.cursor/skills/` — Project-specific procedural skills

Skills are step-by-step procedures for recurring tasks specific to this project. They are pulled on demand by agents — they do not auto-load.

For general-purpose skills (debugging, brainstorming, code review), use the global skill system in `~/.cursor/skills/` and the bundled `cursor-public` plugins. This directory is for skills tied to this homelab.

## When to write a skill

- A procedure recurs and has multiple steps that should be done in order.
- The steps involve project-specific tools, paths, or conventions.
- Getting the order wrong has consequences (broken state, wasted time, partial deploys).

If the procedure is one or two commands, document it in a rule or a README instead.

## File convention

```
.cursor/skills/<skill-name>.md
```

Suggested sections:

- **Purpose** — what this skill accomplishes
- **When to use** — triggers, prerequisites
- **Steps** — numbered, executable, with the exact commands
- **Verification** — how to confirm the skill worked
- **Rollback** — how to undo if it didn't

## Current skills

| Skill                              | Purpose                                                                                                   | Triggers                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `helm-deployment.md`               | Deploy a Helm chart end-to-end: chart review, HelmRelease config, Authentik integration, post-deploy      | Adding a new app via Helm; updating an existing HelmRelease's structure         |
| `mcp-deployment.md`                | Deploy an MCP server via ToolHive and wire it into LiteLLM                                                | Adding a new MCP server under `flux/manifests/04-apps/artificial-intelligence/` |
| `cnpg-logical-database-restore.md` | Logical CNPG restore: suspend Flux → `cnpg-data-extract` → fresh `Cluster` → `cnpg-data-restore`          | Restoring or migrating a CNPG database via `pg_dump`/`pg_restore`               |
| `generic-app-longhorn-restore.md`  | Restore a Longhorn-backed volume for a `generic-app` workload, with PV/PVC re-render from `helm template` | Recovering a faulted/missing Longhorn volume for a `generic-app` deployment     |
