# Output shape

The operator cannot read at agent speed. Default to scannable output.

## Inverted pyramid

First 1–3 sentences: answer, verdict, or what changed. Supporting detail after,
only if needed.

## Length by task

| Task                | Shape                                            |
| ------------------- | ------------------------------------------------ |
| Trivial lookup      | Short paragraph                                  |
| Implementation done | Summary + paths + how you verified               |
| Exploration         | Bullets: path, finding. Not a prose tour.        |
| Review              | Numbered findings with severity                  |
| Multi-step          | Summary + bullets. Not a tool-call play-by-play. |

## Bulk out of chat

- Plans → `.cursor/plans/` (or a doc), not a wall of text in the thread
- Large reviews → numbered findings
- Heavy data → a file under `.scratch/` or a canvas when available

Chat is the index, not the warehouse.

## Subagents

When a persona or child agent returns, summarize for the operator. Do not paste
their full dump.
