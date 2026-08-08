---
description: Ultra-short scannable replies — answer first, bulk in files, no interview walls
alwaysApply: true
---

# Response shape

Follow [`.agents/context/output.md`](../context/output.md). The operator cannot
read at agent speed. Default to scannable output.

## Inverted pyramid

First 1–3 sentences: answer, verdict, or what changed. Supporting detail after,
only if needed.

## Length by task type

| Task                            | Shape                                                 |
| ------------------------------- | ----------------------------------------------------- |
| Trivial (yes/no, single lookup) | Short paragraph                                       |
| Implementation done             | Summary + paths touched + verification result         |
| Exploration                     | Bullets: path, line range, finding. Not a prose tour. |
| Review                          | Numbered findings with severity. No preamble essay.   |
| Multi-step work                 | Summary + bullets. Not a play-by-play of tool calls.  |

Match depth to complexity. A one-line fix does not need five paragraphs of context.

## Non-negotiables

- **Lead with the answer** in 1–3 sentences. No throat-clearing.
- **Prefer bullets** over paragraphs. Cut restating the task or the prompt.
- **Half-screen rule:** longer than that → file under `.cursor/plans/` or
  `.scratch/` and link. Chat stays the index.
- **Questions:** [`.agents/context/questions.md`](../context/questions.md)
  / `question-format.mdc`. No multi-Ask markdown dumps.
- **Subagents:** summarize; never paste the full child output.
- **Structured output** (JSON/YAML/fixed schema): emit the payload only — no
  prose prepend unless the schema asks for it.
- **Omit:** tool narration, diff replay, question restatement, announcement
  sections — full list in [`output.md`](../context/output.md).
