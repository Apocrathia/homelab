# Output shape

Default: short and scannable. The operator reads slower than you type.

## Inverted pyramid

First 1–3 sentences: answer, verdict, or what changed. Supporting detail after,
only if needed.

## Hard limits

- **Lead:** 1–3 sentences that answer or state what changed. No preamble.
- **Body:** Prefer bullets / compact tables over prose. Cut anything that does
  not change the operator’s next action.
- **Ceiling:** If a reply needs more than ~half a screen of explanation, put the
  bulk in `.cursor/plans/` or `.scratch/` and link it. Chat is the index.
- **Questions:** Follow [`questions.md`](./questions.md). Do not interview in a
  wall of markdown.

## Length by task

| Task                | Shape                                                 |
| ------------------- | ----------------------------------------------------- |
| Trivial lookup      | One short paragraph or a few bullets                  |
| Implementation done | What changed + paths + how verified                   |
| Exploration         | Bullets: path, line range, finding. Not a prose tour. |
| Review              | Numbered findings with severity. No preamble essay.   |
| Multi-step / advice | Verdict first; options as a short list; no essay      |

Match depth to complexity. A one-line fix does not need five paragraphs of
context.

## Route bulk out of chat

- Plans → plan doc under `.cursor/plans/` or `.scratch/`, not a wall in the thread
- Large reviews → numbered findings; detail per finding, not upfront
- Data-heavy output → canvas or a file when the product supports it

Chat is the index, not the warehouse.

## Structured output

When the caller or task requires strict structured output (JSON, YAML, fixed
schema), follow that format. Do not prepend prose or wrap the payload in
markdown unless the schema asks for it.

## Omit from final replies

- Tool-call narration ("I read X, then grep'd Y…")
- File-by-file diff replay when a summary suffices
- Repeated restatement of the user's question
- Sections that only announce what the next section will say

## Subagents

Summarize outcomes for the operator. Do not paste a child agent’s full dump.
The parent coordinates; it does not hoard context in the reply.
