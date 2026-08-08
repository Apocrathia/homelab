# `.agents/rules/`

Source of truth for **all** agent rules (Markdown). Cursor discovers every rule
via a per-file `.mdc` symlink under
[`.cursor/rules/`](../../.cursor/rules/README.md) (SoT is `.md` here; discovery
name stays `.mdc`). Cursor frontmatter (`alwaysApply`, `globs`, `description`)
lives inside each `.md` and is read through the symlink.

## Always-on

| File                               | Summary                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `general.md`                       | Personality, hard non-negotiables, cross-cutting decisions  |
| `security.md`                      | Scan-on-change + core security principles                   |
| `protected-paths.md`               | Confirm before editing high blast-radius paths              |
| `stop-loss.md`                     | After 3 failed attempts at the same approach, stop          |
| `clarify-dont-guess.md`            | Ask when ambiguous; advice vs action; permission discipline |
| `ground-before-asking.md`          | Prove from repo/data before asking the operator             |
| `ambiguity-goes-back-to-source.md` | Flag irreducible ambiguity with `[NEEDS CLARIFICATION]`     |
| `question-format.md`               | AskQuestion-first; points at `context/questions.md`         |
| `response-shape.md`                | Short replies; half-screen rule                             |
| `subagents.md`                     | Personas + Prompt contract; fan out; implementer↔reviewer  |
| `ponytail.md`                      | YAGNI / minimal-code + surgical touch discipline            |
| `surgical-edits.md`                | Simplicity-first + touch-only-what-you-must edit contract   |
| `worktrees.md`                     | Agent edits only in `.worktrees/` on a dedicated branch     |

## Glob-scoped

| File           | Glob                                  | Summary                                                                       |
| -------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| `flux.md`      | `flux/*`                              | Flux/Kustomize directory structure, deployment process, Authentik integration |
| `gitops.md`    | `flux/**`                             | GitOps workflow principles (fromValues, explicit config, iterative testing)   |
| `helm.md`      | `helm/*`                              | Template logic, volume management, values structure, validation, icons        |
| `talos.md`     | `talos/*`                             | Talos Linux configuration, networking, security baseline, maintenance         |
| `renovate.md`  | `renovate.json`                       | Renovate bot configuration, regex manager format                              |
| `python.md`    | `**/*.py`                             | Toolchain (uv/ruff), style, type hints, async patterns, security              |
| `docs.md`      | `**/*.md`                             | Documentation style, prettier workflow, no duplicated tunables                |
| `humanizer.md` | `**/*.md`                             | Strip AI writing patterns in docs                                             |
| `secrets.md`   | `**/*.{yaml,yml,tf,env,json,sh,conf}` | Secret patterns to flag, file types to check, 1Password best practices        |

## Agent-requestable (load on demand)

| File                              | Summary                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `operations.md`                   | Maintenance and ops practices, backup/recovery, QA-during-ops                 |
| `observability.md`                | Monitoring, logging, alerting, metrics, health indicators                     |
| `mcp.md`                          | MCP tools usage — when to prefer MCP over CLI, tool selection                 |
| `context7.md`                     | Context7 MCP usage patterns for retrieving up-to-date library documentation   |
| `deepwiki.md`                     | DeepWiki MCP usage patterns for repository research and antipattern detection |
| `conventional-commit-messages.md` | Conventional Commits specification for commit messages                        |

Edit files here, not the `.cursor/rules/` symlinks. After adding a rule, add
`<name>.mdc` → `../../.agents/rules/<name>.md` under `.cursor/rules/` and
update both this README and
[`.cursor/rules/README.md`](../../.cursor/rules/README.md).
