# `.cursor/memories/` — Lessons learned

Memories are notes captured by agents (or the user) after solving a problem worth remembering. They exist to prevent future agents from re-discovering the same gotcha, footgun, or non-obvious behavior.

## When to write a memory

- A bug or quirk took non-trivial effort to diagnose.
- A tool, chart, or service has surprising behavior that isn't obvious from its docs.
- A workaround was applied that future agents might be tempted to "fix" without understanding why.
- A decision was made that future agents should respect (and the reasoning behind it).

If the lesson belongs in a rule (always applicable, encodes policy), put it in `.cursor/rules/` instead. Memories are for situational knowledge.

## File convention

One file per topic:

```
.cursor/memories/<topic>.md
```

Suggested sections:

- **Context** — what were we doing, what went wrong or surprised us
- **Lesson** — the actual takeaway, stated plainly
- **References** — links to commits, PRs, issues, related files

Keep memories short and specific. If a memory grows past a page, consider splitting it.

## When to consult

Before working in a domain, check for a memory file matching that domain. Grep the directory if unsure.

## Current memories

_None yet. Agents and the user add entries here as lessons accumulate._

| Topic | Summary |
| ----- | ------- |
| —     | —       |
