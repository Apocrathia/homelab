# Context management

How to keep a usable window across long runs. The always-on rule is
[`.agents/rules/context-management.md`](../rules/context-management.md). This
module holds thresholds, smells, handoffs, and the post-compact reload ritual.

Portable: works in any harness. Prefer a real window meter when the harness
exposes one. Do not hardcode product names.

<!-- TODO: Tune the meter threshold and smell list for homelab if
operators disagree with the defaults below. Keep a single threshold; do not
scatter alternate numbers into personas. -->

Prior art (reference only, not a dependency):
[obra/superpowers](https://github.com/obra/superpowers) subagent-driven-development
(file handoffs, progress ledger, status vocabulary). Ideas here are rewritten
natively for `.agents/`; do not require that plugin.

## Meter threshold

When the harness reports context-window usage:

- **Compact before the next heavy turn** when usage is **≥ 60%** of the window.
- Also compact when the projected next turn (prompt + likely tool/subagent
  returns) would push past 60%, even if current usage is lower.
- Soft preference: leave headroom; do not ride the ceiling.

The **60% threshold is mandatory** and copied from the always-on rule
to all consumers. Do not override it here; if your instance needs a different
threshold, update the rule `context-management.md` first.

When no meter is available, use smell triggers below. Same compact/fork/
delegate/write actions.

## Smell triggers (no meter)

Compact (same Goal) when any of these stack up:

- Parent is re-summarizing the same decisions because the window is noisy
- Full tool outputs or subagent transcripts are still sitting in the parent
- Multiple failed approaches are still in-thread after a stop-loss or pivot
- Re-reading the same large files that already have a disk note or summary
- Spawn prompts are accumulating prior-task paste instead of file paths

Fork when:

- The thread clearly serves two Goals
- Operator changed destination mid-run (new repo, new ticket, new product ask)
- Compact would discard too much and a written handoff is cheaper than recovery

Delegate when:

- The next step is a multi-file scout or long shell/MCP dump the parent does
  not need to keep
- A pair loop (implement ↔ review) should run in fresh child contexts

Write to disk when:

- Decisions, Bars, or path lists must survive compact
- A skill names a task folder or ticket folder for durable state
- Dispatching a child that needs a long brief, diff, or report

**Persistence cliff:** corrections that live only as "remember to…" leak across
sessions. Binary structural rules persist; proportional vibes do not. Prefer
writing the decision to disk (ledger, state file, ticket note) over hoping the
next session inherits it from chat.

## File handoffs

Everything pasted into a spawn prompt (and everything a child prints back)
stays in the parent window for the rest of the session. Prefer files:

| Artifact              | Where                                                      | Spawn prompt contains                  |
| --------------------- | ---------------------------------------------------------- | -------------------------------------- |
| Task brief            | `<task-folder>/brief.md` (or `task-N-brief.md`)            | Path + one-line fit in the project     |
| Child report          | `<task-folder>/report.md` (or matching `task-N-report.md`) | Path; child writes full report there   |
| Diff / review package | `<task-folder>/review-package.diff` (or similar)           | Path for the reviewer to `Read`        |
| Progress ledger       | `<task-folder>/progress.md` or ticket `progress.md`        | Parent updates; children do not own it |

Child **Return** to parent: status line, commits if any, one-line summary,
concerns. Pair-loop reviewers and verifiers (readonly: true) return **inline evidence**
(findings, citations, comments). Implementers and orchestrators return **path to the
report file** instead; not the full report body.

Do not paste accumulated "state after tasks 1..N" into later dispatches. Hand
only: this task's brief path, interfaces/decisions prior tasks produced that
the brief cannot know, global constraints, report path.

## Progress ledger

Conversation memory does not survive compact. Track multi-step work on disk:

- At start of a multi-task run, open or create the ledger under the task or
  ticket, issue, or task folder (`progress.md`).
- When a task's review is clean, append one line with checkable evidence:
  `Task N: complete (<report path and/or commits>, review clean)`.
  A complete mark without a report path or commits is not durable evidence.
- After compact or resume: trust the ledger over recollection, not over disk.
  Before skipping a `complete` task, confirm the cited report path or commit
  exists. Missing or evidence-less marks are insufficient evidence; treat them
  as incomplete and re-dispatch (or re-verify) rather than skip.
- If the ledger is deleted, recover from ticket, issue, or task notes first; use git
  log only when a repo exists. Rebuild the ledger before continuing.

## Session state file (optional)

For multi-session ticket, issue, or program work, a thin `state.md` (or ticket/
issue `notes.md` header) beats a growing chat. Minimum fields:

| Field              | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `stage`            | One-line status                          |
| `updated`          | Last substantive update (date)           |
| `current_position` | 1-3 sentences: where we are, what's next |
| `artifacts`        | Living paths only (drop superseded)      |
| `active_decisions` | Downstream-binding decisions             |
| `next_steps`       | Ordered actions                          |

Keep the index short (aim under ~200 lines). Overflow to sibling files with
one-line pointers. Omit transcripts and resolved history from the index.

The **progress ledger** is the minimal form of this for a single multi-task
run. Use the fuller state file when work spans sessions or multiple agents.

State that matters lives outside the model: durable structures the agent reads
but does not own.

## What to keep across compact

Preserve explicitly (restate after compact if the harness does not):

- Goal and Bar
- Bound repo / ticket / Artifact paths
- Decisions already locked
- Open questions still unresolved
- Live child/subagent map (names, PR numbers, status)
- Progress ledger path

Drop:

- Raw tool output
- Dead-end attempts
- Full child transcripts (keep summaries + evidence pointers)

## Post-compact reload ritual

1. Re-read [`AGENTS.md`](../../AGENTS.md) for routing that applies to the
   current Goal.
2. Load only the named modules from
   [`.agents/context/loading.md`](./loading.md) for that Goal.
3. Re-read any always-on rules the harness does not re-inject after compact
   (if unsure, rely on generated always-on concat when the harness uses it).
4. Read the progress ledger; resume at the first incomplete task.
5. Confirm Goal/Bar/paths still match disk notes if you wrote them.
6. Continue. Do not rebuild the transcript by re-running every tool.

The context engine on disk is authoritative. The chat transcript is a cache.

## Pairing with other surfaces

| Surface                                           | Role                                         |
| ------------------------------------------------- | -------------------------------------------- |
| [`subagents.md`](../rules/subagents.md)           | Fan out; congruent models; status vocabulary |
| [`response-shape.md`](../rules/response-shape.md) | Operator-facing brevity                      |
| [`loading.md`](./loading.md)                      | What to pull after compact                   |
| [`stop-loss.md`](../rules/stop-loss.md)           | Stop retrying; then compact or fork          |
| Ticket / issue / task folders                     | Durable local context that outlives compact  |
| [`traps.md`](./traps.md)                          | Hollow-output and process skip smells        |

## Enforcement preference

When choosing how to make a failure less likely, prefer stronger over weaker:

1. **Prevent** (make the bad action impossible)
2. **Make expensive** (honest path cheaper than faking)
3. **Detect** (independent check catches it)
4. **Instruct** (behavioral rule only)

Prompts are documentation. Disk, schemas, and pair review are enforcement.
Lift recurring instruct-only fixes toward detect or prevent when you can.

## Anti-patterns

- Hoarding full diffs and MCP dumps "in case"
- Compacting away the Bar without writing it to disk first
- Forking without a handoff file (the new session starts blind)
- Claiming token visibility when the harness has no meter; use smells instead
- Reloading every context module after every compact (use routing, not panic)
- Re-dispatching ledger-complete tasks after compact
- Pasting multi-task history into every child spawn
