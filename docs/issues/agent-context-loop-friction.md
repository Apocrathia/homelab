---
title: "Tighten agent context loop: commit policy, vertical slices, and tool use"
kind: architecture
status: in-flight
severity: medium
source: dogfood
found_at: 2026-07-22
found_by: composer
area: agents
slice: hitl
plan: docs/plans/tighten-agent-context-loop.md
---

# Tighten agent context loop: commit policy, vertical slices, and tool use

## Problem / desired state

Agent context is directionally strong (tiers, GitOps constraints, personas) but
policy collisions and harness friction burn tokens. After alignment
(2026-07-22), desired state is:

### Commit and ship

1. **One commit policy** — default: agents do not commit or push. Soft ship
   language ("ship it", "LGTM", "looks good", "go ahead") and explicit
   `commit` / `push` both authorize shipping. Final approval is enforced by
   IDE/git hooks (always run; no `--no-verify` / hook bypass).
2. **Hard stops even when authorized** — secrets / credential-looking files;
   force-push to `main`/`master`; amend of someone else's or already-pushed
   commit; staging clearly unrelated WIP. Advisory (warn, still proceed if
   authorized): messy or incomplete-looking diffs.
3. **Attribution (soft)** — prefer
   `Co-authored-by: Composer <composer@cursor.com>` on agent-shipped commits;
   missing it is not a hard stop.
4. **Ship target by mode** — attended (operator in the loop): commit/push
   straight to `main` (homelab norm; no feature-branch tax). Autonomous: never
   commit/push directly to `main` — feature branch + MR (or equivalent) so a
   human merges before Flux sees it. Diverged-main recipe (attended): stash
   unrelated WIP → rebase onto `origin/main` → push → restore WIP; no
   force-push to main.

### Vertical slices and scouts

5. **Scout laps find work; they do not own remediation end-to-end.** Keep the
   full find-work scout catalog, including whole-repo security scans. Work on
   the ranked queue is agent-sized vertical slices (docs, review, authoring,
   plan, implement, research, reconcile — not implement-only).
6. **Broad findings default to document** — e.g. Trivy CRITICAL/HIGH → Launch
   brief forks to `file-issue` / findings ledger. Plan and implement are later
   laps once ledger rows exist. Direct implement only when the finding is
   already one vertical slice: named feedback loop + single-PR-sized. Hard
   numeric cost thresholds are deferred; use that soft heuristic for now.

### Questions, tools, startup

7. **Question contract** — prefer the harness structured-question / interview
   tool when it appears in the tool list; otherwise one prose Ask
   (`questions.md`). Do not hard-require a specific tool name. Wiring Cursor's
   question UI into every session is a **separate chase**, not this issue.
8. **MCP-first for live systems** — Flux, Grafana, GitLab, Trivy, k8sgpt, etc.
   use MCP when configured. Local filesystem / git / renders use Shell, Read,
   Grep. Prefer the path that spends fewer tokens for the same answer. Sandbox
   failure is not "tool dead" — escalate out of sandbox / request approval and
   retry. Do not dual-path the same read after MCP already returned data.
9. **Startup slim for "what's next" / "find something to do"** — required load
   is `find-work` plus the thin loop context it points at. SRE / debug /
   implement and other heavy skills load after a Launch brief is selected.
   Repo [`loading.md`](../../.agents/context/loading.md) owns startup; do not
   document third-party always-invoke plugins in agent context (they may be
   absent).

## Repro

N/A (architecture). Dogfood signals from a 2026-07-22 lap informed alignment;
details live in session history, not as standing repro steps.

## Acceptance

- A single commit/push rule is SoT across `AGENTS.md`, `.agents/context/`, and
  Cursor rules: authorized by soft ship language or explicit commit/push;
  hard stops and hooks documented; no contradictory absolute "never commit"
  that ignores operator authorization. Grep for commit policy returns one
  coherent story (or pointers to it).
- Attended vs autonomous ship targets are documented (`development-loop` /
  `draft-commit` / run-loop): attended → `main`; autonomous → branch/MR, never
  direct `main`.
- Diverged-main stash → rebase → push → restore recipe is written once (no
  force-push to main).
- `find-work` keeps full scouts; documents that scout output is Launch briefs
  sized as vertical slices; broad scan findings default to `file-issue`, not
  end-to-end remediate.
- `question-format` / `questions.md` prefer structured tool when present;
  prose fallback otherwise; no hard require of a missing tool name.
- `tools.md` states MCP-first for live systems; shell for local; sandbox
  escalate-and-retry; no dual-path after MCP success.
- `loading.md` (or find-work) states find-work-only startup for "what's next"
  / "find something to do"; heavy skills after brief selection; no dependency
  on third-party plugin names in portable context.

## Feedback loop

- `rg -n 'never commit|Never.*git commit|commit/push|Co-authored-by' AGENTS.md .agents/ .cursor/rules/`
  — one coherent commit/ship policy.
- `rg -n 'autonomous|attended|feature branch|diverged|stash' .agents/skills/draft-commit/ .agents/context/development-loop.md .agents/skills/run-loop/`
  — attended vs autonomous ship paths + diverged-main recipe.
- `rg -n 'file-issue|vertical|scout' .agents/skills/find-work/SKILL.md .agents/context/development-loop.md`
  — scout → document default; slice-sized briefs.
- `rg -n 'structured-question|AskQuestion|prose Ask' .agents/context/questions.md .agents/rules/question-format.md .cursor/rules/question-format.mdc`
  — prefer-when-present, not hard-require.
- `rg -n 'MCP-first|sandbox|dual-path' .agents/context/tools.md`
  — MCP-first live systems; escalate sandbox; no dual-path.
- `rg -n 'find something to do|what.s next|find-work-only|startup' .agents/context/loading.md .agents/skills/find-work/SKILL.md`
  — slim startup.
- `python3 .agents/skills/reconcile-context/scripts/check_links.py`
- `python3 .agents/skills/reconcile-context/scripts/check_discovery.py`

## Implementation hint

Protected-path edits (`.agents/**`, `.cursor/**`, `AGENTS.md`). Prefer
`reconcile-context` / `context-steward` after wording moves. Author under
`docs/plans/` if the how-work needs checkboxes. Out of scope here: Cursor
question-tool session wiring; hard numeric slice-cost thresholds; Cursor
auto-review classifier allowlists (in-repo owns invocation shape + brief
forks).

## Notes

- Alignment completed 2026-07-22 (HITL).
- Slice `hitl`: policy wording needs operator judgment before landing.
- Related: `find-work`, `draft-commit`, `development-loop`, `run-loop`,
  `loading.md`, `tools.md`, `questions.md`, `question-format`, `file-issue`.
- Influence: prime-swarm vertical-slice discipline (thin agent-sized laps with
  named feedback loops) — borrow the idea in homelab loop docs; do not vendor
  that repo's files.
