# Development loop

Find → rank → one Launch brief → fork by work type → ship path → operator
commit. Chat is not the backlog: issues = desired state; plans = how; merged
MRs = behavior; reconcile closes the lap.

Durable contract for the loop. Wave trackers and open decisions live under
`.scratch/` (throwaway); this file wins for how agents run a lap.

## Non-negotiables (loop)

Overrides any conflicting pattern. Full lab constraints:
[`constraints.md`](./constraints.md).

| Constraint                | Implication                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Never `git commit` / push | Ship stops at propose-ship (stage + Conventional Commit draft + optional draft MR). Operator commits.                                                                                          |
| Ask before cluster mutate | No auto `kubectl apply`, `flux reconcile`, or mutating MCP without explicit ask. Unattended = read-only scouts.                                                                                |
| Protected paths           | `.agents/**`, `.cursor/**`, `.claude/**`, `AGENTS.md`/`CLAUDE.md`, `talos/**`, `helm/generic-app/**`, `flux/manifests/01-bootstrap/**` → **stop / skip** unattended unless operator confirmed. |
| Advice ≠ implement        | Consultative language → options only until asked to build.                                                                                                                                     |
| Discover is read-only     | `find-work` does not edit. Build only after a Launch brief is selected.                                                                                                                        |
| Empty queue               | Lap-report and **stop**. No busywork, no tight-loop find-work.                                                                                                                                 |
| Stop-loss                 | 3 identical failures → stop and surface.                                                                                                                                                       |

## State machine

```
find-work (read-only)
  → ranked Launch briefs (1..N)
  → walk 1→N; first eligible wins
  → fork by work type:
       alignment (HITL / fuzzy)     → stop if unattended
       plan authoring               → project-planner
       implement-change             → implementer → verifier → review
       watch-mr                     → maintain open MR
       reconcile-context            → steward / skill
       file-issue                   → docs backlog
       autoresearch                 → idle-only (later)
  → (shipping path)
       review-loop → reconcile-docs → reconcile-context → propose-ship
  → operator commit + push (+ optional local apply to observe)
  → Flux reconciles pushed truth
  → clock-out / lap-report → find-work again (or stop if empty)
```

Issue → plan → code (anti-rot: delete satisfied issues/plans; no `closed/`):

```
gap → (alignment if fuzzy) → file-issue (docs/issues/)
  → plan authoring
  → implement-change (one MR / lap)
  → reconcile-docs → reconcile-context → propose-ship → operator merge
```

## Work types / fork targets

### Available now

| Fork                       | Invoke                                                                          |
| -------------------------- | ------------------------------------------------------------------------------- |
| Fuzzy scope / HITL         | [`alignment`](../skills/alignment/SKILL.md)                                     |
| File / update / close gaps | [`file-issue`](../skills/file-issue/SKILL.md)                                   |
| Context / link drift       | [`reconcile-context`](../skills/reconcile-context/SKILL.md) + `context-steward` |
| Plan authoring             | `project-planner` → `.cursor/plans/` today                                      |
| Manifest edit / verify     | `manifest-implementer` / `manifest-verifier`                                    |
| Ops / security signals     | `site-reliability-engineer` / `security-analyst`                                |
| Doc audits                 | `documentation-reviewer`                                                        |
| Domain deploy / restore    | `helm-deployment`, `mcp-deployment`, restore skills                             |

### Wave 4+ (not skills yet — do not invent)

`find-work` (Wave 3, parallel), `implement-change`, `review-loop`,
`reconcile-docs`, `propose-ship`, `watch-mr`, constant-loop orchestrator,
`autoresearch`.

Until those land: discover and file/rank via existing skills; implement with
personas above when the operator selects a brief; never auto-commit.

## Ranking (debt-first)

| Tier | Class                    | Examples                                                                    |
| ---- | ------------------------ | --------------------------------------------------------------------------- |
| 1    | Production / correctness | Flux NotReady, critical alerts, red CI on default branch, security CRITICAL |
| 2    | Tech debt / architecture | Ready bugs/arch issues, clustered `ponytail:`, context drift, stale plans   |
| 3    | MR maintenance           | Maintain-eligible open MRs (threads, failing CI, conflicts)                 |
| 4    | Issues                   | Ready implement / plan / plan-refresh (not 1–3)                             |
| 5    | Features                 | Ready feature / roadmap                                                     |
| 6    | Scoping                  | Needs alignment; feature plan stubs                                         |
| 7    | Authoring tail           | New gaps / low-priority plans when 1–6 empty                                |
| 8    | Autoresearch             | Only when 1–7 empty + research contract + budgets                           |

Within tier: severity (`blocker` > `high` > `medium` > `low`) → FIFO by
`found_at`. Queue, not stack.

## Launch brief

Each actionable find-work row emits a pasteable brief. Discover is read-only;
build only after the brief is selected.

```text
## Launch N — <title>
- Source: <issue path | alert | Flux object | MR>
- Evidence: <paths / queries / links>
- Acceptance: <observable done>
- Feedback loop: <verify command(s)>
- Worktree / branch: <optional>
- Dedupe: <not in flight | skip:… | unverified>
- Constraints: <protected | HITL | no cluster mutate | …>
- Invoke: <skill or persona>
```

If you cannot name a feedback loop (`kustomize build`, `helm template`, Trivy,
Flux MCP read, yamllint, …), the work is not scoped → `alignment`. Prefer thin
slices (~1000 absolute changed lines / MR). One implement lap = one MR.

## Gates

### Always

- Never commit or push.
- Ask before cluster mutate.
- Advice language → do not implement.
- Empty eligible queue → lap-report and stop.
- Partial scout failure → omit implement briefs; mark `dedupe unverified`.

### Unattended (constant-loop / AFK)

- Skip `slice: hitl`, protected-path edits, and `alignment`.
- Skip `status: blocked` / `in-flight` for new implement briefs.
- Tiers 1–2 outrank `watch-mr`.
- Tiers 4–5 require zero eligible `watch-mr` (finish in-flight first).
- If every brief is ineligible → stop.

### Attended

- Protected paths still need confirmation (operator request counts; summarize first).
- Fuzzy scope → run `alignment` before implement.
- Operator may waive a gate for one lap; that waiver does not carry forward.

## Related skills

| Skill / persona                                             | Role in the loop                                  |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `find-work` (Wave 3)                                        | Read-only scouts → ranked Launch briefs           |
| [`file-issue`](../skills/file-issue/SKILL.md)               | Backlog ledger under `docs/issues/`               |
| [`reconcile-context`](../skills/reconcile-context/SKILL.md) | Agent context / link health after behavior moves  |
| [`alignment`](../skills/alignment/SKILL.md)                 | Fuzzy scope; skip unattended                      |
| `implement-change` / `propose-ship`                         | Wave 4 — orchestrate implement → verify → handoff |

## Out of scope

Permanent — not deferred trackers.

- Auto-commit / auto-push / auto-merge
- Auto-allow protected paths or cluster mutation
- Unbounded overnight research without budgets
- Discord as system of record
- Renovate dashboard as the agent prioritizer (deps ≠ work queue)
- Swarm / harness lifecycle skills foreign to this lab
