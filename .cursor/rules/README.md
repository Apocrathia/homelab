# `.cursor/rules/` — Rule index

Cursor loads these `.mdc` files based on their frontmatter. This README is a
human- and agent-readable index — it does not change loading behavior.

**Portable behavioral rules** live under
[`.agents/rules/`](../../.agents/rules/README.md) as Markdown (`.md`) and
appear here as `.mdc` **symlinks**. **Domain GitOps rules** are real `.mdc`
files in this directory.

## Frontmatter scoping

| Frontmatter         | Behavior                                                             |
| ------------------- | -------------------------------------------------------------------- |
| `alwaysApply: true` | Injected into every agent turn                                       |
| `globs: <pattern>`  | Injected when files matching the pattern are in the working set      |
| `description: <…>`  | Agent-requestable; agents pull it on demand based on the description |

## Current rules

### Always-on (SoT: `.agents/rules/*.md` → symlink `*.mdc` here)

| File                     | Summary                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `general.mdc`            | Personality, hard non-negotiables (no commits, no cluster mutations), cross-cutting decisions      |
| `security.mdc`           | Scan-on-change workflow + core security principles (1Password CRs, least privilege)                |
| `protected-paths.mdc`    | Stop and ask before editing `.agents/`, `.cursor/`, `.claude/`, `talos/`, `generic-app`, bootstrap |
| `stop-loss.mdc`          | After 3 failed attempts at the same approach, stop and surface the problem                         |
| `clarify-dont-guess.mdc` | Ask when ambiguous; prefer AskQuestion; advice vs action; permission discipline                    |
| `question-format.mdc`    | AskQuestion-first; prose = one Ask; points at `.agents/context/questions.md`                       |
| `response-shape.mdc`     | Ultra-short replies; half-screen rule; no interview walls                                          |
| `subagents.mdc`          | Prefer defined personas for plan / implement / verify / SRE / security / docs / context            |
| `ponytail.mdc`           | Lazy-senior YAGNI / minimal-code + surgical touch                                                  |

### Glob-scoped (load when matching files are touched)

| File            | Glob                                                           | SoT                          | Summary                                                                       |
| --------------- | -------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `flux.mdc`      | `flux/*`                                                       | this dir                     | Flux/Kustomize directory structure, deployment process, Authentik integration |
| `gitops.mdc`    | `flux/**`                                                      | this dir                     | GitOps workflow principles (fromValues, explicit config, iterative testing)   |
| `helm.mdc`      | `helm/*`                                                       | this dir                     | Template logic, volume management, values structure, validation, icons        |
| `talos.mdc`     | `talos/*`                                                      | this dir                     | Talos Linux configuration, networking, security baseline, maintenance         |
| `renovate.mdc`  | `renovate.json`                                                | this dir                     | Renovate bot configuration, regex manager format                              |
| `python.mdc`    | `**/*.py`                                                      | this dir                     | Toolchain (uv/ruff), style, type hints, async patterns, security              |
| `docs.mdc`      | `**/*.md`                                                      | this dir                     | Documentation style, prettier workflow, no duplicated tunables                |
| `humanizer.mdc` | `**/*.md`                                                      | `.agents/rules/humanizer.md` | Removing AI writing patterns from documentation                               |
| `secrets.mdc`   | `**/*.{yaml,yml,tf,tfvars,env,json,sh,conf,config,properties}` | this dir                     | Secret patterns to flag, file types to check, 1Password best practices        |

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

1. **Portable / behavioral:** create `.agents/rules/<name>.md`, symlink
   `<name>.mdc` → that file from here, update
   [`.agents/rules/README.md`](../../.agents/rules/README.md) and this index.
2. **Domain (Flux/Helm/Talos/…):** create `<name>.mdc` here with frontmatter,
   add a row above.
3. Keep rule content focused — one concern per file.
