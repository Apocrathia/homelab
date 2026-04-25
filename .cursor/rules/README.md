# `.cursor/rules/` — Rule index

Cursor loads these `.mdc` files based on their frontmatter. This README is a human- and agent-readable index — it does not change loading behavior.

## Frontmatter scoping

| Frontmatter         | Behavior                                                             |
| ------------------- | -------------------------------------------------------------------- |
| `alwaysApply: true` | Injected into every agent turn                                       |
| `globs: <pattern>`  | Injected when files matching the pattern are in the working set      |
| `description: <…>`  | Agent-requestable; agents pull it on demand based on the description |

## Current rules

### Always-on

| File                     | Summary                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `general.mdc`            | Personality, hard non-negotiables (no commits, no cluster mutations), cross-cutting decisions   |
| `security.mdc`           | Scan-on-change workflow + core security principles (1Password CRs, least privilege)             |
| `protected-paths.mdc`    | Stop and ask before editing high-blast-radius paths (`.cursor/`, `talos/`, `helm/generic-app/`) |
| `stop-loss.mdc`          | After 3 failed attempts at the same approach, stop and surface the problem                      |
| `clarify-dont-guess.mdc` | Ask when ambiguous; distinguish advice from action; permission-question discipline              |
| `question-format.mdc`    | Canonical Context → Ask → Suggestion → Gaps format for non-trivial questions                    |

### Glob-scoped (load when matching files are touched)

| File            | Glob                                                           | Summary                                                                       |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `flux.mdc`      | `flux/*`                                                       | Flux/Kustomize directory structure, deployment process, Authentik integration |
| `gitops.mdc`    | `flux/**`                                                      | GitOps workflow principles (fromValues, explicit config, iterative testing)   |
| `helm.mdc`      | `helm/*`                                                       | Template logic, volume management, values structure, validation, icons        |
| `talos.mdc`     | `talos/*`                                                      | Talos Linux configuration, networking, security baseline, maintenance         |
| `renovate.mdc`  | `renovate.json`                                                | Renovate bot configuration, regex manager format                              |
| `python.mdc`    | `**/*.py`                                                      | Toolchain (uv/ruff), style, type hints, async patterns, security              |
| `docs.mdc`      | `**/*.md`                                                      | Documentation style, prettier workflow, no duplicated tunables                |
| `humanizer.mdc` | `**/*.md`                                                      | Removing AI writing patterns from documentation                               |
| `secrets.mdc`   | `**/*.{yaml,yml,tf,tfvars,env,json,sh,conf,config,properties}` | Secret patterns to flag, file types to check, 1Password best practices        |

### Agent-requestable (load on demand)

| File                               | Summary                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `operations.mdc`                   | Maintenance and ops practices, backup/recovery, QA-during-ops                 |
| `observability.mdc`                | Monitoring, logging, alerting, metrics, health indicators                     |
| `mcp.mdc`                          | MCP tools usage — when to prefer MCP over CLI, tool selection                 |
| `context7.mdc`                     | Context7 MCP usage patterns for retrieving up-to-date library documentation   |
| `deepwiki.mdc`                     | DeepWiki MCP usage patterns for repository research and antipattern detection |
| `conventional-commit-messages.mdc` | Conventional Commits specification for commit messages                        |

## Adding a rule

1. Create `<name>.mdc` with frontmatter (`alwaysApply`, `globs`, or `description`).
2. Add a row to the table above.
3. Keep rule content focused — one concern per file.
