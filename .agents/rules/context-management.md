---
alwaysApply: true
description: Context hygiene; meter-first compact, fork when goals split, reload from disk
---

# Context management

Keep the working window thin. Prefer disk and the context engine over the
transcript. Details and thresholds:
[`.agents/context/context-management.md`](../context/context-management.md).

## Meter-first

When the harness exposes context-window usage, read it before a heavy turn
(large tool returns, multi-file reads, subagent fan-out). If usage is at or
above **60%** of the window, compact (or the harness equivalent) before that
turn. Prefer compacting early over failing mid-tool.

When no meter exists, use the smell triggers in the context module.

## Compact vs fork vs delegate vs write

| Situation                                                  | Action                                                                                                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same Goal; window fat with tool dumps or dead ends         | **Compact**. Keep Goal, Bar, decisions, paths, open questions, live child map.                                                                             |
| After compact                                              | **Reload from disk**: `AGENTS.md` routing → named `.agents/context/*` and rules. Check the progress ledger. Do not treat the transcript as the rule store. |
| Thread holds 2+ unrelated Goals, or the job clearly forked | **Fork** a new session/Task with a written handoff under the ticket or bucket.                                                                             |
| About to load a fat tree you only need a summary from      | **Delegate** (subagent); keep the return, drop the raw material.                                                                                           |
| State must survive any compact                             | **Write to disk** early (ticket folder, task folder, or notes path).                                                                                       |

## File handoffs

Bulk for children travels as **paths**, not paste. Write briefs, reports, and
diff packages under the ticket or task folder; spawn prompts name those paths.
Child returns stay short (status + path to full report), except read-only children
(reviewers, verifiers) who return inline evidence. See the context module
(`.agents/context/context-management.md`, installed atomically with this rule when
`integrate-upstream` is run on consumers).

## Always

- Do not paste full tool dumps or subagent transcripts into the parent window.
- Summarize child results; cite paths and evidence, not walls of output.
- Pair with [`subagents.md`](./subagents.md) and [`response-shape.md`](./response-shape.md).
