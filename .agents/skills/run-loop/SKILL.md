---
name: run-loop
description: >-
  Constant-loop orchestrator: walk find-work Launch briefs in scout,
  unattended, or attended mode. Never a persona. Use for Cron scouts and
  AFK/attended lap walks — not for inventing work.
disable-model-invocation: true
---

# Run loop

Constant-loop **orchestrator**. Walks [`find-work`](../find-work/SKILL.md)
Launch briefs; invokes sibling skills by path. Not a persona — do not invent
parallel procedures.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

## Modes

| Mode         | Behavior                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scout`      | `find-work` → optional [`file-issue`](../file-issue/SKILL.md) for new gaps → Discord or lap-report summary → **STOP** (no [`implement-change`](../implement-change/SKILL.md) / [`autoresearch`](../autoresearch/SKILL.md)). Cron default. |
| `unattended` | Walk briefs 1→N (max **3** tries default); only AFK-eligible; first success wins; **STOP**. One implement/research lap max per session. Autoresearch only with pre-authorized contract.                                                   |
| `attended`   | Operator-driven; may run [`alignment`](../alignment/SKILL.md); protected paths need confirm; autoresearch OK after contract confirm.                                                                                                      |

Pick mode from the invoke context (Cron → `scout`; AFK Automation →
`unattended`; interactive → `attended`). If unclear, ask once — do not guess.

## When to run

| Trigger                                        | Mode                    |
| ---------------------------------------------- | ----------------------- |
| Scheduled Cron / A2A (`run-loop-agent-invoke`) | `scout` (no checkout)   |
| AFK / constant-loop                            | `unattended`            |
| Operator "run the loop" / lap walk             | `attended` or as stated |

Skip when the operator already handed a single scoped brief — go straight to
[`implement-change`](../implement-change/SKILL.md) (or the named Invoke).

## Workflow

```
- [ ] 1. Resolve mode (scout | unattended | attended)
- [ ] 2. Run find-work (read-only) → ranked Launch briefs
- [ ] 3. Apply stop gates G1–G18 before any mutate / implement
- [ ] 4. Mode fork:
         scout      → optional file-issue for new gaps → notify + lap-report → STOP
                      (never autoresearch / implement-change)
         unattended → walk 1→N AFK-eligible only; first success → one lap max → STOP
                      (autoresearch only if pre-authorized tier-8 brief)
         attended   → operator may pick / waive; alignment OK; confirm protected
                      (autoresearch OK with contract confirm)
- [ ] 5. On win by Invoke:
         implement-change → review-loop → reconcile-docs → reconcile-context → draft-commit
         watch-mr         → maintain path (no GitOps ship)
         autoresearch     → skill owns docs ship → review-loop → draft-commit
- [ ] 6. Write lap report under .scratch/laps/; Discord notify-only if configured
- [ ] 7. STOP — no tight re-find after empty / ineligible stop
```

## Ironclad stop gates (G1–G18)

Hit any gate → write lap report (gate id + reason) → **STOP**. Do not invent
work or re-scout in a tight loop.

| Gate | Condition                                                           | Action                                                         |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| G1   | Empty queue (no Launch briefs)                                      | Lap-report; stop                                               |
| G2   | All briefs ineligible under current mode                            | Lap-report; stop                                               |
| G3   | Consultative operator language ("advice", "considering", …)         | Options only; no implement                                     |
| G4   | Fuzzy scope / needs `alignment` while `unattended` or `scout`       | Skip brief or stop; no silent scope invent                     |
| G5   | `slice: hitl`                                                       | Skip unattended/scout; attended only                           |
| G6   | Protected-path edit required                                        | Stop/skip unless operator confirmed this lap                   |
| G7   | Cluster mutate required (`kubectl apply` / `flux reconcile` / …)    | Ask; never auto                                                |
| G8   | Commit / push / merge / non-draft land on default branch            | **Never** — draft-commit handoff only                          |
| G9   | `status: blocked` or `status: in-flight` (new implement)            | Skip                                                           |
| G10  | Hot-MR lock present (see below) or `Dedupe: skip:hot-lock`          | Skip                                                           |
| G11  | Stop-loss: 3 identical failures of the same approach                | Surface; stop that approach / lap                              |
| G12  | [`review-loop`](../review-loop/SKILL.md) budget exhausted (~5)      | Surface blockers; no 6th pass                                  |
| G13  | Partial scout failure                                               | Omit implement briefs from failed scouts; `Dedupe: unverified` |
| G14  | Tier 4–5 while eligible `watch-mr` / tier-3 MR work exists          | Prefer MR maintain; skip 4–5                                   |
| G15  | `scout` mode after find (+ optional file-issue)                     | Notify + lap-report; **no implement-change / autoresearch**    |
| G16  | Lap budget: unattended already completed one implement/research lap | Stop; do not start a second                                    |
| G17  | Tier-8 / `autoresearch` while any tier 1–7 brief is eligible        | Skip tier 8; prefer debt-first work                            |
| G18  | `autoresearch` without approved seed / complete contract / budgets  | Skip; never invent hypotheses                                  |

## Hot-MR / in-flight dedupe

Respect locks from [`watch-mr`](../watch-mr/SKILL.md) (when present):

- Path: `.scratch/watch-mr/locks/!{iid}.lock` (TTL per that skill).
- Active lock → treat as **G10**; skip that MR brief.
- Briefs marked `Dedupe: skip:hot-lock` → skip.
- `status: in-flight` → skip for **new** implement (G9); maintain via
  `watch-mr` only when that is the Invoke.

If `watch-mr` is missing, still honor lock files and dedupe markers when present;
do not invent merge behavior.

## Lap reports

Write under `.scratch/laps/` (see `.scratch/laps/README.md`):

```text
.scratch/laps/YYYY-MM-DD-<slug>.md
```

`.scratch/` is gitignored — local durable for the session, not Git SoT.
**Discord is notify-only**, never system of record.

Minimum fields:

| Field              | Content                                    |
| ------------------ | ------------------------------------------ |
| Mode               | `scout` \| `unattended` \| `attended`      |
| Briefs considered  | Titles / Launch N ids                      |
| Selected           | Winning brief or none                      |
| Actions            | Skills invoked; files touched (paths only) |
| Stop gate          | G# + reason, or none                       |
| Next operator step | Commit? Confirm protected? Apply? Idle?    |

## Critical constraints

- Never `git commit` / push / merge.
- Never cluster-mutate without explicit ask.
- Never auto-allow protected paths.
- Never invent work on an empty queue (G1).
- Never tight-loop `find-work` after an empty / all-ineligible stop (G1/G2).
- One unattended implement lap max per session (G16).
- `scout` never calls `implement-change` or `autoresearch` (G15).
- Never invent tier-8 research without an approved contract (G18).

## Related

| Path                                                          | Role                                       |
| ------------------------------------------------------------- | ------------------------------------------ |
| [`development-loop.md`](../../context/development-loop.md)    | Loop contract                              |
| [`find-work`](../find-work/SKILL.md)                          | Ranked Launch briefs                       |
| [`file-issue`](../file-issue/SKILL.md)                        | New gaps (esp. scout)                      |
| [`implement-change`](../implement-change/SKILL.md)            | One implement lap                          |
| [`watch-mr`](../watch-mr/SKILL.md)                            | MR maintain + hot locks                    |
| [`autoresearch`](../autoresearch/SKILL.md)                    | Idle tier-8 research; docs-only            |
| [`draft-commit`](../draft-commit/SKILL.md)                    | Commit/MR handoff; never commit            |
| [`review-loop`](../review-loop/SKILL.md)                      | Local verify before ship                   |
| [`reconcile-docs`](../reconcile-docs/SKILL.md)                | Behavior docs + delete satisfied artifacts |
| [`reconcile-context`](../reconcile-context/SKILL.md)          | Agent context / links                      |
| [`docs/issues/README.md`](../../../docs/issues/README.md)     | Backlog ledger                             |
| [`docs/research/README.md`](../../../docs/research/README.md) | Research ledger + seeds                    |

## Homelab constraints

- GitOps manifests remain SoT for tunable config; Gateway API only; 1Password
  Item CRs for secrets.
- Advice ≠ implement (G3).
- Operator owns commit and any live apply / Flux reconcile.
- No Discord-as-backlog. Autoresearch only via find-work tier-8 briefs with
  approved seeds / complete contracts (G17/G18) — never invent research topics
  from an empty queue.
