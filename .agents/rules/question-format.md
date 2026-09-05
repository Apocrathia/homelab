---
alwaysApply: true
description: Prefer structured-question tool when present; prose = one Ask; no markdown question walls; strawman drafts for open-ended asks
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

Trivial single-concern factual questions ("did you mean `foo.yaml` or
`bar.yaml`?") don't need the full structure.

## Prose fallback (exactly one Ask per turn)

Order is fixed.

**Context:** Why it matters. 1–3 sentences. What's at stake.

**Ask:** The question. **Bold**, own line, never buried in a paragraph.

**Suggestion:** Recommendation + brief why, or no preference. For an
open-ended ask with no genuine recommendation, replace this block with
**Strawman:** (see below). Do not nest a strawman here, and do not add a
fifth block.

**Gaps/concerns:** Only if real. Omit when empty; don't write "none".

## Strawman drafts

For open-ended asks (a definition, design, plan, or name), don't just ask the
question. Commit to a deliberately rough draft, explicitly labeled as a
strawman, and invite the operator to tear it apart. Critiquing a concrete
artifact is cheaper than generating from scratch, and a rough draft surfaces
the operator's real criteria faster than an open question.

The strawman **replaces** the **Suggestion** slot. Ordered slots stay
Context → Ask → Strawman → Gaps, with Gaps still optional (omit when none).
When you have a genuine recommendation, keep **Suggestion** and skip the
strawman: a strawman is for open problems, not a hedge.

Always label the draft as a strawman. Passing weak work off as your best
answer destroys trust.

## Forbidden

- Multiple `Context → Ask → Suggestion` stacks in one chat reply
- Restating structured-question tool options as a markdown wall under the tool call
