# AGENTS.md

## What this is

A Kubernetes homelab managed through GitOps. Stack and architecture:
[`README.md`](./README.md). Portable agent config lives under
[`.agents/`](./.agents/README.md) ([.agents Protocol](https://dotagentsprotocol.com/)
layout). This file is a **router**, not a full manual.

For lab context, start at
[`.agents/context/README.md`](./.agents/context/README.md), then open the module
your task needs.

## What you can and can't do

**Do freely:**

- Read files, explore, search (workspace root OK)
- Run validation, linting, scanning, local renders
- Install local dev dependencies
- Propose changes and present options
- Use [`.scratch/`](./.scratch/README.md) for throwaways (prefer it over `/tmp`)

**Before editing files:** open or create a git worktree under `.worktrees/` —
see [`.agents/rules/worktrees.md`](./.agents/rules/worktrees.md). Do not edit
the workspace root checkout unless the operator authorizes it for that lap.

**Requires explicit permission:**

- Live cluster mutation (`kubectl apply` / `delete`, `flux reconcile`, etc.)
- Anything destructive or irreversible

**Commit / push:**

- Default: no commit or push. Soft ship language ("ship it", "LGTM", "looks
  good", "go ahead") or explicit `commit` / `push` authorizes it for that lap.
  Full policy + hard stops:
  [`constraints.md`](./.agents/context/constraints.md#commit-and-ship).

Explore and validate all you want. Do not touch anything live without asking.

## Always in force

Full text: [`.agents/context/constraints.md`](./.agents/context/constraints.md).
Tone: [`.agents/context/voice.md`](./.agents/context/voice.md) (peer-to-peer,
terse, humor OK, **profanity encouraged**).

- GitOps manifests are the source of truth for tunable config
- Gateway API only (no Ingress)
- 1Password Item CRs for secrets (not bare managed Secret YAML)
- No commit/push without authorization; never cluster-mutate without ask
  ([`constraints.md`](./.agents/context/constraints.md#commit-and-ship))
- Confirm before editing protected paths
  ([`protected-paths.md`](./.agents/rules/protected-paths.md))
- Edit in a worktree, not the workspace root
  ([`worktrees.md`](./.agents/rules/worktrees.md))
- Answer first; keep chat the index
  ([`response-shape.md`](./.agents/rules/response-shape.md),
  [`output.md`](./.agents/context/output.md))
- Ask structured questions when ambiguous; don't guess
  ([`question-format.md`](./.agents/rules/question-format.md),
  [`clarify-dont-guess.md`](./.agents/rules/clarify-dont-guess.md),
  [`ground-before-asking.md`](./.agents/rules/ground-before-asking.md),
  [`ambiguity-goes-back-to-source.md`](./.agents/rules/ambiguity-goes-back-to-source.md),
  [`questions.md`](./.agents/context/questions.md))
- Stop after 3 failed attempts at the same approach
  ([`stop-loss.md`](./.agents/rules/stop-loss.md))
- Write the minimum; touch only what the request requires
  ([`ponytail.md`](./.agents/rules/ponytail.md),
  [`surgical-edits.md`](./.agents/rules/surgical-edits.md))
- Delegate early; summarize child output
  ([`subagents.md`](./.agents/rules/subagents.md))

## Routing

Start at [`.agents/context/README.md`](./.agents/context/README.md). Skip detail:
[`.agents/context/loading.md`](./.agents/context/loading.md). When a task spans
rows, read each.

| If you're…                                 | Then read (after the context README)                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New here / unsure                          | [`.agents/context/README.md`](./.agents/context/README.md) only                                                                                                            |
| Starting non-trivial work                  | [`traps.md`](./.agents/context/traps.md)                                                                                                                                   |
| Unsure what to load vs skip                | [`loading.md`](./.agents/context/loading.md)                                                                                                                               |
| Any work that could mutate GitOps          | [`constraints.md`](./.agents/context/constraints.md)                                                                                                                       |
| Making any file edit (code or docs)        | [`worktrees.md`](./.agents/rules/worktrees.md)                                                                                                                             |
| Naming resources, dirs, or apps            | [`nomenclature.md`](./.agents/context/nomenclature.md)                                                                                                                     |
| Scope is fuzzy                             | [`alignment`](./.agents/skills/alignment/SKILL.md)                                                                                                                         |
| Architecture friction / design-debt issues | [`architecture-review`](./.agents/skills/architecture-review/SKILL.md)                                                                                                     |
| Throwaway prototype for a design question  | [`prototype`](./.agents/skills/prototype/SKILL.md)                                                                                                                         |
| Post-lap / session retrospective           | [`retrospective`](./.agents/skills/retrospective/SKILL.md)                                                                                                                 |
| Sync shared .agents/ from prime-context    | [`integrate-upstream`](./.agents/skills/integrate-upstream/SKILL.md)                                                                                                       |
| Deploying a Helm app                       | [`helm-deployment`](./.agents/skills/helm-deployment/SKILL.md)                                                                                                             |
| Adding an MCP server                       | [`mcp-deployment`](./.agents/skills/mcp-deployment/SKILL.md)                                                                                                               |
| CNPG logical restore                       | [`cnpg-logical-database-restore`](./.agents/skills/cnpg-logical-database-restore/SKILL.md)                                                                                 |
| Longhorn volume restore (generic-app)      | [`generic-app-longhorn-restore`](./.agents/skills/generic-app-longhorn-restore/SKILL.md)                                                                                   |
| Filing a gap / local issue                 | [`file-issue`](./.agents/skills/file-issue/SKILL.md), [`docs/issues/README.md`](./docs/issues/README.md)                                                                   |
| Browsing the agent backlog                 | [`docs/issues/README.md`](./docs/issues/README.md)                                                                                                                         |
| Finding / prioritizing next work           | [`find-work`](./.agents/skills/find-work/SKILL.md), [`development-loop.md`](./.agents/context/development-loop.md)                                                         |
| Development loop / ranking / Launch briefs | [`development-loop.md`](./.agents/context/development-loop.md), [`vertical-slices.md`](./.agents/context/vertical-slices.md)                                               |
| Post-lap learning / enforcement promotion  | [`retrospective`](./.agents/skills/retrospective/SKILL.md), [`learning-loop.md`](./.agents/context/learning-loop.md), [`enforcement.md`](./.agents/context/enforcement.md) |
| Implementing a Launch brief / one lap      | [`implement-change`](./.agents/skills/implement-change/SKILL.md)                                                                                                           |
| Docs/issue/plan closure after a change     | [`reconcile-docs`](./.agents/skills/reconcile-docs/SKILL.md)                                                                                                               |
| Local verify before ship                   | [`review-loop`](./.agents/skills/review-loop/SKILL.md)                                                                                                                     |
| Draft commit/MR handoff                    | [`draft-commit`](./.agents/skills/draft-commit/SKILL.md)                                                                                                                   |
| Constant / unattended loop                 | [`run-loop`](./.agents/skills/run-loop/SKILL.md), [`development-loop.md`](./.agents/context/development-loop.md)                                                           |
| Babysit open MR                            | [`watch-mr`](./.agents/skills/watch-mr/SKILL.md)                                                                                                                           |
| Idle research / autoresearch               | [`autoresearch`](./.agents/skills/autoresearch/SKILL.md), [`docs/research/README.md`](./docs/research/README.md)                                                           |
| Plans backlog                              | [`docs/plans/README.md`](./docs/plans/README.md)                                                                                                                           |
| Research ledger                            | [`docs/research/README.md`](./docs/research/README.md)                                                                                                                     |
| Editing Flux/Helm manifests                | [`manifest-implementer`](./.agents/agents/manifest-implementer/agent.md)                                                                                                   |
| Validating manifest diffs                  | [`manifest-verifier`](./.agents/agents/manifest-verifier/agent.md)                                                                                                         |
| Incident / reliability                     | [`site-reliability-engineer`](./.agents/agents/site-reliability-engineer/agent.md)                                                                                         |
| Security review                            | [`security-analyst`](./.agents/agents/security-analyst/agent.md)                                                                                                           |
| Planning multi-step work                   | [`project-planner`](./.agents/agents/project-planner/agent.md)                                                                                                             |
| Doc quality pass                           | [`documentation-reviewer`](./.agents/agents/documentation-reviewer/agent.md)                                                                                               |
| Context drift detect (propose-only)        | [`context-steward`](./.agents/agents/context-steward/agent.md)                                                                                                             |
| Choosing MCP vs CLI                        | [`tools.md`](./.agents/context/tools.md)                                                                                                                                   |
| Clarifying with the operator               | [`questions.md`](./.agents/context/questions.md)                                                                                                                           |
| Writing a reply or asking a question       | [`voice.md`](./.agents/context/voice.md), [`output.md`](./.agents/context/output.md), [`questions.md`](./.agents/context/questions.md)                                     |
| Writing docs / agent tone                  | [`voice.md`](./.agents/context/voice.md), [`output.md`](./.agents/context/output.md)                                                                                       |
| Reconciling agent context drift            | [`reconcile-context`](./.agents/skills/reconcile-context/SKILL.md)                                                                                                         |
| Agent rules (behavioral + domain)          | [`.agents/rules/`](./.agents/rules/README.md)                                                                                                                              |
| Cursor-only rules / hooks / commands       | [`.cursor/README.md`](./.cursor/README.md)                                                                                                                                 |
| Claude Code adapter                        | [`.claude/README.md`](./.claude/README.md)                                                                                                                                 |

## Where things live

| Path                                                | Role                                                   |
| --------------------------------------------------- | ------------------------------------------------------ |
| [`.agents/context/`](./.agents/context/README.md)   | Living context (hub + modules)                         |
| [`.agents/skills/`](./.agents/README.md)            | Procedural skills (source of truth)                    |
| [`.agents/agents/`](./.agents/README.md)            | Personas (source of truth)                             |
| [`.agents/rules/`](./.agents/rules/README.md)       | All agent rules (Cursor discovers via `.mdc` symlinks) |
| [`.agents/memories/`](./.agents/memories/README.md) | Cross-session lessons                                  |
| [`.cursor/`](./.cursor/README.md)                   | Cursor adapter (hooks, commands, discovery symlinks)   |
| [`.claude/`](./.claude/README.md)                   | Claude Code adapter (discovery symlinks)               |
| [`CLAUDE.md`](./CLAUDE.md)                          | Symlink → [`AGENTS.md`](./AGENTS.md)                   |

Portable tree map: [`.agents/README.md`](./.agents/README.md).
