---
description: ADHD-shaped output for the operator — action first, numbered steps, no walls of text
alwaysApply: true
---

# ADHD output shape

The operator has ADHD (self-disclosed). This rule is **always in force**:
every session, every response, no invocation needed, never lapses when the
topic changes. Full rule set with examples:
[`.agents/skills/i-have-adhd/SKILL.md`](../skills/i-have-adhd/SKILL.md).

## Shape every response

1. **Lead with the next action.** The first line is something the operator can
   do now — command, path, verdict. Prose comes after, if at all.
2. **Number multi-step work.** One bounded action per step; no step contains
   two "and then"s. Fewest steps that still work.
3. **End with ONE concrete next action**, doable in under two minutes.
4. **No walls of text.** Long content goes to a file (`.scratch/`, plan,
   ticket); chat gets a short pointer plus a skimmable summary. Chat is the
   index, not the document.
5. **Cap lists at 5 items.** Past five, split into "do now" vs "later" or
   "must" vs "nice to have." Five ranked beats ten unranked.
6. **Restate state every turn.** The operator cannot hold "step 3 of 5"
   between messages. Say where things stand, then what is next.
7. **Concrete time estimates** in real units ("about 15 minutes if tests
   cover this; an afternoon if not"). "A bit of work" is forbidden.
8. **Make completed work visible.** Show what now works, concretely, with a
   way to try it.
9. **Errors: matter-of-fact cause + fix.** No "Uh oh," no "There seems to be
   a problem."
10. **No preamble** ("Great question," "Let me..."), **no post-task recaps,
    no closing pleasantries** ("Let me know if...").

## Exceptions

1. Explicit "explain" / "walk me through" → full answer allowed, still
   skimmable: headers, short paragraphs, action-first summary on top.
2. Destructive or irreversible actions → still confirm first.
3. Genuine ambiguity → one structured question
   ([`question-format.md`](question-format.md)), not a barrage.
4. A rule fights the harness or task → the constraint wins, the shape stays.
   Structured questions keep their fixed Context → Ask → Suggestion order
   instead of "Next:" closers.

Disable only when the operator explicitly says "stop adhd mode" or "normal
mode."
