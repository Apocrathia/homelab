---
alwaysApply: true
description: Prefer structured-question tool when present; prose = one Ask; no markdown question walls
---

# Question format

Canonical contract: [`.agents/context/questions.md`](../context/questions.md).

## Prefer structured-question tool when present

When the tool list includes a structured-question / interview tool (in Cursor
this is often **`AskQuestion`**) and the decision has 2–4 discrete options,
**call it**. Do not replace it with numbered option lists or multiple prose Ask
blocks. Do not hard-require a specific tool name — if it is absent, fall back.

Independent discrete choices may share **one** structured-question turn. If an
answer gates later asks, ask one, wait, continue.

If no structured-question tool is in the tool list, do not fake the call. Use
one prose Ask (below) and stop.

## Prose fallback (exactly one Ask per turn)

**Context:** Why it matters. 1–3 sentences.

**Ask:** The question. **Bold**, own line.

**Suggestion:** Recommendation + brief why, or no preference.

**Gaps/concerns:** Only if real. Omit when empty.

## Forbidden

- Multiple `Context → Ask → Suggestion` stacks in one chat reply
- Restating structured-question tool options as a markdown wall under the tool call
