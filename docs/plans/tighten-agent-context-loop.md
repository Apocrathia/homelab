---
title: "Tighten agent context loop policy wording"
status: active
found_at: 2026-07-22
updated_at: 2026-07-22
related_issue: docs/issues/agent-context-loop-friction.md
area: agents
---

# Tighten agent context loop policy wording

## Goal

Land one coherent commit/ship, scout-slice, question, tool, and startup story
across portable agent context so dogfood sessions stop burning tokens on
contradictory "never commit" vs authorized-ship rules and related harness
friction. Desired state SoT:
[`docs/issues/agent-context-loop-friction.md`](../issues/agent-context-loop-friction.md)
(aligned 2026-07-22).

## Scope

**In scope:**

- Wording + policy updates under `.agents/` (context, rules, skills) and the
  always-on router surfaces that must agree (`AGENTS.md`, Cursor rule adapters
  that symlink into `.agents/rules/`).
- `draft-commit` / `run-loop` / `find-work` / `implement-change` / related loop
  skills: attended vs autonomous ship targets; soft authorization; hard stops;
  vertical-slice Launch briefs; broad-scan → `file-issue` default.
- `tools.md`, `loading.md`, `questions.md` / `question-format`,
  `development-loop.md`, `constraints.md`.
- Post-edit `reconcile-context` link + discovery checks; issue acceptance grep
  loops green.
- Link this plan from the issue `plan:` frontmatter; delete-on-ship when
  acceptance is met.

**Out of scope:**

- Cursor question-tool session wiring (separate chase).
- Hard numeric slice-cost thresholds.
- Cursor auto-review classifier allowlists (in-repo owns invocation shape +
  brief forks only).
- Vendoring prime-swarm files (borrow the vertical-slice idea only).
- Live cluster mutation; inventing new loop skills beyond wording in existing
  ones.
- Changing git hook implementations (document that hooks always run; do not
  rewrite hook scripts unless a wording gap forces a pointer).

## Decisions

From alignment (2026-07-22) — locked for this plan:

| Decision                   | Choice                                                                                                      | Why / reversibility                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Commit authorization       | Soft ship language ("ship it", "LGTM", "looks good", "go ahead") **and** explicit `commit`/`push` authorize | Hooks still gate the actual call; reversible by tightening soft list |
| Hard stops when authorized | Secrets; force-push to main/master; amend others'/pushed commits; unrelated WIP staging                     | Public-repo blast radius; keep                                       |
| Attribution                | Prefer `Co-authored-by: Composer <composer@cursor.com>`; soft                                               | Missing trailer is not a stop                                        |
| Ship target                | Attended → `main`; autonomous → feature branch + MR, never direct `main`                                    | Homelab HITL vs Flux exposure                                        |
| Diverged main (attended)   | stash → rebase onto `origin/main` → push → restore; no force-push to main                                   | Written once in draft-commit / development-loop                      |
| Scout output               | Vertical-slice Launch briefs; broad findings default `file-issue`                                           | Multi-lap ownership; soft heuristic for "already one slice"          |
| Questions                  | Prefer structured-question tool **when in tool list**; else one prose Ask; no hard tool name                | Harness-neutral SoT in `questions.md`                                |
| Live systems               | MCP-first; Shell/Read/Grep for local; sandbox fail → escalate + retry; no dual-path after MCP success       | Token + false "tool dead"                                            |
| Startup                    | "what's next" / "find something to do" → `find-work` + thin loop context only; heavy skills after brief     | No third-party plugin names in portable context                      |
| Edit surface               | `.agents/` is SoT; Cursor rules/skills mostly symlinks — edit the target once                               | Discovery check catches Claude adapter drift                         |

## File map (edit SoT once)

Protected paths — **confirm with operator before any edit** in this list:

| Path                                                 | Responsibility                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                          | Top-level router: replace absolute "never commit" with authorized-ship summary + pointer                                    |
| `.agents/context/constraints.md`                     | Canonical non-negotiables: commit policy, hard stops, hooks                                                                 |
| `.agents/context/development-loop.md`                | Loop table: attended vs autonomous ship; soft auth; diverged-main pointer                                                   |
| `.agents/context/tools.md`                           | MCP-first live systems; local shell; sandbox escalate; no dual-path                                                         |
| `.agents/context/loading.md`                         | Slim startup row for find-work-only "what's next"                                                                           |
| `.agents/context/questions.md`                       | Prefer-when-present (already close; tighten if any hard-require leaks)                                                      |
| `.agents/rules/general.md`                           | Always-on commit policy (Cursor: `general.mdc` symlink)                                                                     |
| `.agents/rules/question-format.md`                   | Prefer structured tool when present; prose fallback (Cursor: `.mdc` symlink)                                                |
| `.agents/skills/draft-commit/SKILL.md`               | When authorized: commit/push paths; hard stops; Co-authored-by; attended main vs autonomous branch/MR; diverged-main recipe |
| `.agents/skills/run-loop/SKILL.md`                   | Autonomous never ships to main; attended may; soft auth language                                                            |
| `.agents/skills/find-work/SKILL.md`                  | Vertical-slice briefs; broad scan → `file-issue`; keep full scout catalog                                                   |
| `.agents/skills/implement-change/SKILL.md`           | Hand off to ship path; do not contradict new commit policy                                                                  |
| Other skills with absolute "Never commit" one-liners | Point at constraints / draft-commit instead of inventing a second policy                                                    |

Do **not** edit symlink stubs under `.cursor/rules/*.mdc` or
`.cursor/skills/*` when they point at `.agents/` — edit the target. If
`.claude/skills/` holds file copies, sync after SoT edit or fix discovery so
they stay linked; `check_discovery.py` is the gate.

## Steps

### 0. Gate — protected-path confirm

- [x] Before first edit under `.agents/**`, `.cursor/**`, `.claude/**`, or
      `AGENTS.md`, ask operator: "About to edit protected agent-context paths
      for this plan; confirm?" Stop until explicit yes. (Confirmed 2026-07-22.)

### 1. Canonical commit / ship policy

Write the full policy **once** in
[`.agents/context/constraints.md`](../../.agents/context/constraints.md), then
make every other surface a short summary + pointer.

Required content in `constraints.md` (replace absolute "Never commit"):

- Default: agents do not commit or push.
- Authorization: soft ship language **or** explicit `commit` / `push`.
- Hooks always run; never `--no-verify` / hook bypass.
- Hard stops even when authorized (list from issue §2).
- Soft attribution trailer.
- Pointer to `development-loop.md` + `draft-commit` for attended vs autonomous
  targets and diverged-main recipe (do not duplicate long recipes here).

Then update in the same vertical slice:

- [x] `.agents/context/constraints.md` — full policy
- [x] `AGENTS.md` — "Always in force" / permissions bullets match; no absolute
      never that ignores authorization
- [x] `.agents/rules/general.md` — match (symlink feeds Cursor)
- [x] `.agents/context/development-loop.md` — constraints table row for
      commit/push; attended vs autonomous; link diverged-main

**Verify:**

```bash
rg -n 'never commit|Never.*git commit|commit/push|Co-authored-by|soft ship|authorized' \
  AGENTS.md .agents/context/constraints.md .agents/context/development-loop.md \
  .agents/rules/general.md
```

Expect one coherent story (or explicit pointers to `constraints.md`).

### 2. Ship path skills — `draft-commit` + `run-loop`

- [x] Rewrite
      [`.agents/skills/draft-commit/SKILL.md`](../../.agents/skills/draft-commit/SKILL.md)
      CRITICAL section:
  - Still default to draft-only when **not** authorized.
  - When authorized (soft or explicit): may `git commit` / `git push` per mode.
  - Attended → `main`; include diverged-main stash → rebase → push → restore
    recipe (no force-push to main).
  - Autonomous → create/use feature branch + draft/ready MR as appropriate;
    **never** commit/push directly to `main`.
  - Hard stops + soft `Co-authored-by: Composer <composer@cursor.com>`.
  - Stage still only when asked or as part of an authorized ship (do not stage
    unrelated WIP).
- [x] Update
      [`.agents/skills/run-loop/SKILL.md`](../../.agents/skills/run-loop/SKILL.md)
      stop gates / ship notes: `unattended` never lands on `main`; `attended`
      may ship to `main` when authorized; scout mode still does not ship.
- [x] Update
      [`.agents/skills/implement-change/SKILL.md`](../../.agents/skills/implement-change/SKILL.md)
      and any sibling loop skills that say absolute "never commit" so they point
      at `draft-commit` + authorization instead of a second SoT.

**Verify:**

```bash
rg -n 'autonomous|attended|feature branch|diverged|stash|Co-authored-by|Never.*git commit' \
  .agents/skills/draft-commit/ .agents/skills/run-loop/ \
  .agents/skills/implement-change/ .agents/context/development-loop.md
```

### 3. Sweep residual absolute "never commit" one-liners

- [x] Grep and retarget remaining hits under `.agents/skills/`,
      `.agents/agents/`, `.agents/memories/` (and Cursor/Claude adapters only if
      they are **copies**, not symlinks):

```bash
rg -n 'Never.*git commit|never commit|never run `git commit`|Operator owns commit|operator commits' \
  AGENTS.md .agents/ .cursor/rules/ .claude/skills/
```

- [x] For each hit: either (a) replace with "default no commit; see
      `constraints.md` / `draft-commit`" or (b) keep "never" only where the
      skill is **scout/read-only by design** and must not ship even when soft
      language appears in the parent chat (call that out explicitly, e.g.
      find-work remains non-shipping).

**Verify:** same `rg` — no contradictory absolute never on shipping skills;
find-work / file-issue may still say they never commit themselves.

### 4. Vertical slices + find-work scouts

- [x] Update
      [`.agents/skills/find-work/SKILL.md`](../../.agents/skills/find-work/SKILL.md):
  - Keep full scout catalog (including whole-repo security scans).
  - State that ranked work is agent-sized vertical slices (docs, review,
    author, plan, implement, research, reconcile — not implement-only).
  - Broad findings (e.g. Trivy CRITICAL/HIGH) → Launch brief forks to
    `file-issue` / findings ledger by default.
  - Direct implement brief only when already one slice: named feedback loop +
    single-PR-sized (soft heuristic; no numeric thresholds).
- [x] Touch
      [`.agents/context/development-loop.md`](../../.agents/context/development-loop.md)
      fork table / prose so scout → document is visible next to implement forks.

**Verify:**

```bash
rg -n 'file-issue|vertical|scout|Launch brief' \
  .agents/skills/find-work/SKILL.md .agents/context/development-loop.md
```

### 5. Questions, tools, startup

- [x] `.agents/context/questions.md` + `.agents/rules/question-format.md` —
      prefer structured-question / interview tool **when present in the tool
      list**; prose Ask otherwise; no hard-require of a missing name (Cursor may
      still name `AskQuestion` as the adapter example).
- [x] `.agents/context/tools.md` — MCP-first for live systems (Flux, Grafana,
      GitLab, Trivy, k8sgpt, …); Shell/Read/Grep for local filesystem/git/
      renders; sandbox failure → escalate permissions / approval and retry;
      do not dual-path the same read after MCP succeeded; prefer fewer tokens
      for the same answer.
- [x] `.agents/context/loading.md` (+ find-work "When to run" if needed) —
      "what's next" / "find something to do" loads `find-work` + thin loop
      context only; SRE/debug/implement load after Launch brief selection; do
      not name third-party always-invoke plugins in portable context.

**Verify:**

```bash
rg -n 'structured-question|AskQuestion|prose Ask' \
  .agents/context/questions.md .agents/rules/question-format.md
rg -n 'MCP-first|sandbox|dual-path' .agents/context/tools.md
rg -n 'find something to do|what.s next|find-work|startup' \
  .agents/context/loading.md .agents/skills/find-work/SKILL.md
```

### 6. Reconcile + close the lap

- [x] Run:

```bash
python3 .agents/skills/reconcile-context/scripts/check_links.py
python3 .agents/skills/reconcile-context/scripts/check_discovery.py
```

- [x] Fix any link/discovery failures caused by this change (including Claude
      skill copy drift if present).
- [x] Re-run **all** issue Feedback loop greps from
      [`agent-context-loop-friction.md`](../issues/agent-context-loop-friction.md).
- [ ] Set issue `status: in-flight` while editing; on green acceptance set
      `status` closed_by / delete issue per ledger rules, delete this plan
      (delete-on-ship), and hand off via `draft-commit` for operator commit
      (or authorized ship per new policy once it lands — chicken/egg: first
      landing still uses today's hooks + operator commit unless operator
      authorizes).
      **HITL hold:** wording ready for operator review before delete-on-ship.

## Feedback loop

Copy of issue acceptance greps (run after steps 1–5 and again at close):

```bash
rg -n 'never commit|Never.*git commit|commit/push|Co-authored-by' AGENTS.md .agents/ .cursor/rules/
rg -n 'autonomous|attended|feature branch|diverged|stash' \
  .agents/skills/draft-commit/ .agents/context/development-loop.md .agents/skills/run-loop/
rg -n 'file-issue|vertical|scout' \
  .agents/skills/find-work/SKILL.md .agents/context/development-loop.md
rg -n 'structured-question|AskQuestion|prose Ask' \
  .agents/context/questions.md .agents/rules/question-format.md .cursor/rules/question-format.mdc
rg -n 'MCP-first|sandbox|dual-path' .agents/context/tools.md
rg -n 'find something to do|what.s next|find-work-only|startup' \
  .agents/context/loading.md .agents/skills/find-work/SKILL.md
python3 .agents/skills/reconcile-context/scripts/check_links.py
python3 .agents/skills/reconcile-context/scripts/check_discovery.py
```

Pass = coherent policy story + scripts exit 0.

## Notes

- Slice `hitl` on the issue: operator judgment on final wording before ship.
- Implementation personas: `context-steward` (propose/reconcile) /
  `reconcile-context` skill after moves; do not freestyle new router tables.
- First commit of this work may still be operator-driven under the **old**
  policy until the new text is what agents load.
- Influence: prime-swarm vertical slices — idea only; do not vendor that repo.
