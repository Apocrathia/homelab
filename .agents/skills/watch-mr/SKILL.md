---
name: watch-mr
description: >-
  Babysit one open GitLab MR: unresolved threads, failing CI, conflicts,
  approvals, draft status. Prefer GitLab MCP. Never merge or approve without
  explicit ask; commit/push/undraft only when ship-authorized. Use for tier-3
  MR maintenance laps.
disable-model-invocation: true
---

# Watch MR

Babysit **one** open GitLab merge request. Gather signals, classify, propose
(or fix only under the action rules below), report, stop. Not a merge bot.

Loop contract:
[`.agents/context/development-loop.md`](../../context/development-loop.md).

## When to use

| Trigger              | Examples                                           |
| -------------------- | -------------------------------------------------- |
| Launch Invoke        | Brief says `Invoke: watch-mr`                      |
| Operator names an MR | "babysit !42", paste MR URL / IID                  |
| Unattended tier-3    | find-work ranked a maintain-eligible open MR first |

**Skip when:**

- GitLab MCP (`user-gitlab`) unavailable / unauthenticated
- MR is merged or closed
- Hot-MR lock is foreign and still fresh (see locks)
- Tiers 1–2 work is still eligible (debt-first: clear prod/correctness first)

## CRITICAL — never ship the MR

This skill maintains; it does **not** land the MR unless the operator named
that exact action.

| Action                                           | Allowed?                                                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read MR / pipelines / discussions / approvals    | Yes                                                                                                                                                                                                                       |
| Reply on a thread                                | Only if operator asked                                                                                                                                                                                                    |
| Resolve a thread                                 | Only if operator asked                                                                                                                                                                                                    |
| Retry / play a failed job                        | Only if operator asked                                                                                                                                                                                                    |
| Approve                                          | **Never** unless operator asked for that approve                                                                                                                                                                          |
| Merge                                            | **Never** unless operator asked for that specific act                                                                                                                                                                     |
| Undraft / mark ready / `git push` / `git commit` | Ship-authorized for this lap only — soft ship language or explicit `commit`/`push` ([`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship)); not on a bare "ready the MR" / "undraft" ask alone |
| Cluster mutate                                   | **Never** without explicit ask                                                                                                                                                                                            |

Default posture: **read + report**. Mutating GitLab or git only when the
operator (or a Launch brief that explicitly authorizes that action) said so.

## Tools

Prefer **`user-gitlab`** MCP over `glab` / raw API.

1. Discover tool schemas (`GetMcpTools` / server inspect) **before** any mutate.
2. Read-only first: resolve MR, list discussions, pipeline status, approvals.
3. If MCP is missing or auth fails → report **skip** and stop. Do not invent a
   CLI deep-dive to fake the skill.

CLI is a last resort for reads when MCP is down and the operator still wants a
signal dump — still no merge/approve/push without ask.

## Workflow

```
- [ ] 1. Resolve MR (IID / URL / Launch brief source)
- [ ] 2. Lock check — read `.scratch/watch-mr/locks/!{iid}.lock`
- [ ] 3. Acquire lock (or skip if foreign+fresh; stale takeover OK)
- [ ] 4. Get signals (threads, CI, conflicts, approvals, draft)
- [ ] 5. Classify maintain-eligible vs ready/drop
- [ ] 6. Propose fixes; act only under CRITICAL rules
- [ ] 7. Emit pasteable report
- [ ] 8. Release lock (delete on clean stop)
- [ ] 9. Stop — one MR per lap; do not chain the next IID
```

## Maintain-eligible signals

| Signal             | Maintain-eligible when                                      | Notes                               |
| ------------------ | ----------------------------------------------------------- | ----------------------------------- |
| Unresolved threads | Open discussions need reply/resolve                         | Do not resolve unless asked         |
| Failing CI         | Pipeline/jobs red on the MR                                 | Retry only if asked                 |
| Conflicts          | Cannot merge cleanly                                        | Report; do not force-push           |
| Approvals          | Missing required approvals                                  | Never self-approve unless asked     |
| Draft              | Still marked draft / WIP                                    | Undraft only if asked               |
| Ready              | No threads, green CI, no conflicts, approvals OK, not draft | **Drop tier-3** — not maintain work |

If ready → say so and stop. find-work should not keep re-queuing it as tier-3.

## Hot-MR locks

Coordination file (local only, not SoT):

Path: `.scratch/watch-mr/locks/!{iid}.lock`

```yaml
mr_iid: 42
url: https://gitlab.example/group/project/-/merge_requests/42
session_id: <agent/session id>
held_at: 2026-07-22T04:00:00Z
expires_at: 2026-07-22T06:00:00Z
intent: watch-mr
```

| Situation                        | Action                               |
| -------------------------------- | ------------------------------------ |
| No lock / expired (`expires_at`) | Acquire (write lock, TTL **2h**)     |
| Same `session_id`                | Refresh / continue                   |
| Foreign + fresh                  | **Skip** this MR; report lock holder |
| Foreign + stale                  | Takeover OK; overwrite lock          |
| Clean stop                       | **Delete** the lock file             |

Convention doc: `.scratch/watch-mr/README.md` (gitignored; not a link target).

## Output contract

Pasteable block; keep chat the index.

```text
## watch-mr — !{iid}

**URL:** <mr url>
**State:** open | merged | closed | skip (<why>)
**Lock:** acquired | skipped foreign | takeover stale | released

**Signals:**
- Threads: <n unresolved> — …
- CI: green | red (<job>) | running | unknown
- Conflicts: yes | no
- Approvals: <have>/<need> | n/a
- Draft: yes | no

**Classification:** maintain-eligible | ready (drop tier-3) | skip

**Actions taken:** <none | list; must match CRITICAL>
**Proposed next:** <operator-facing; no silent merge>

**Stop:** one MR; lock released | held (<why>)
```

## How find-work consumes this

- [`find-work`](../find-work/SKILL.md) **lists** maintain-eligible MRs (tier 3)
  via a shallow scout.
- This skill **executes** the lap for one named MR.
- find-work must **not** deep-dive threads/CI/approvals the way this skill
  does — scout = eligibility signal; watch-mr = maintenance pass.

## Homelab constraints

- Merge / approve: **never** unless the operator explicitly asked for that
  specific action.
- `git commit` / push / undraft / mark ready: ship-authorized for this lap
  only — soft ship language or explicit `commit`/`push`; see
  [`constraints.md#commit-and-ship`](../../context/constraints.md#commit-and-ship).
- Ask before cluster mutate — this skill does not apply or reconcile.
- Protected paths: do not expand MR fixes into unconfirmed protected edits.
- Advice ≠ implement: consultative language → options only until asked.
- Stop-loss: 3 identical failures of the same approach → surface and stop.
- Secrets stay out of reports and lock files.

## Related

- [`.agents/context/development-loop.md`](../../context/development-loop.md)
- [`find-work`](../find-work/SKILL.md)
- [`draft-commit`](../draft-commit/SKILL.md)
- [`run-loop`](../run-loop/SKILL.md) (when present — lap orchestrator)
- [`.agents/context/tools.md`](../../context/tools.md)
