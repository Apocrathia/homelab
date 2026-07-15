# Operator questions

How any harness asks the operator. Keep chats scannable; put decisions in the
right channel.

## Prefer the platform question tool

Most agent harnesses expose a **structured-question / interview tool** (picker,
form, or multi-choice UI). That is the preferred channel for discrete decisions.

1. Look at **your current tool list** for a tool meant to ask the operator
   (names vary: often something like ask / question / choice / interview).
2. If it is present and the decision has ~2–4 concrete options, **call that
   tool**. Put the options in the tool payload — do not also paste them as a
   markdown wall.
3. If the tool is absent, do not invent a call and do not hunt the filesystem or
   MCP catalog for it. Fall back to one prose Ask (below).

Independent discrete choices may share **one** structured-question turn when
the tool allows multiple items. If an answer **gates** the next ask, ask one,
wait, then continue.

Harness adapters may name the concrete tool and UI quirks (e.g. Cursor:
[`.cursor/rules/question-format.mdc`](../../.cursor/rules/question-format.mdc)).
This file stays harness-neutral.

## Anti-pattern

Never dump multiple `Context → Ask → Suggestion` blocks as chat markdown.
Findings can stay in chat; the asks go through the structured tool (or one
prose Ask).

## Prose fallback (exactly one Ask per turn)

Use when the question is open-ended, or no structured-question tool is in the
tool list.

**Context:** Why it matters. 1–3 sentences.

**Ask:** The question. **Bold**, own line.

**Suggestion:** Recommendation + brief why. Or say you have no preference.

**Gaps/concerns:** Only if real. Omit the heading when empty.

Short findings above a single question-tool call are fine. Restating that
tool’s options as a numbered chat list is not.
