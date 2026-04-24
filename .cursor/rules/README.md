# `.cursor/rules/` — Rule index

Cursor loads these `.mdc` files based on their frontmatter. This README is a human- and agent-readable index — it does not change loading behavior.

## Frontmatter scoping

| Frontmatter         | Behavior                                                             |
| ------------------- | -------------------------------------------------------------------- |
| `alwaysApply: true` | Injected into every agent turn                                       |
| `globs: <pattern>`  | Injected when files matching the pattern are in the working set      |
| `description: <…>`  | Agent-requestable; agents pull it on demand based on the description |

## Current rules

| File                               | Scope                  | Summary                                                                       |
| ---------------------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `general.mdc`                      | `alwaysApply: true`    | Personality, project structure, workflow, documentation standards, MCP usage  |
| `security.mdc`                     | `alwaysApply: true`    | Security scanning workflow, finding remediation, scan-on-change policy        |
| `secrets.mdc`                      | `alwaysApply: true`    | Secret patterns to flag, file types to check, 1Password best practices        |
| `flux.mdc`                         | `globs: flux/*`        | Directory structure, Flux/Kustomize guidelines, deployment process            |
| `helm.mdc`                         | `globs: helm/*`        | Template logic, volume management, values structure, testing                  |
| `talos.mdc`                        | `globs: talos/*`       | Talos Linux configuration, networking, security baseline, maintenance         |
| `renovate.mdc`                     | `globs: renovate.json` | Renovate bot configuration, regex manager format                              |
| `python.mdc`                       | `globs: **/*.py`       | Toolchain (uv/ruff), style, type hints, async patterns, security              |
| `humanizer.mdc`                    | `globs: **/*.md`       | Removing AI writing patterns from documentation                               |
| `context7.mdc`                     | Agent-requestable      | Context7 MCP usage patterns for retrieving up-to-date library documentation   |
| `deepwiki.mdc`                     | Agent-requestable      | DeepWiki MCP usage patterns for repository research and antipattern detection |
| `conventional-commit-messages.mdc` | Agent-requestable      | Conventional Commits specification for commit messages                        |

## Adding a rule

1. Create `<name>.mdc` with frontmatter (`alwaysApply`, `globs`, or `description`).
2. Add a row to the table above.
3. Keep rule content focused — one concern per file.
