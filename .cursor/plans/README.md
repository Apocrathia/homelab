# `.cursor/plans/` — Cursor interactive plans

Cursor's native plans surface — plans created here are visible to the IDE's
planning UI. Fine for IDE-only planning sessions.

## Dual surface

| Surface          | Role                                                                               |
| ---------------- | ---------------------------------------------------------------------------------- |
| `docs/plans/`    | Durable / agent-loop SoT — prefer for find-work, multi-session, and GitOps handoff |
| `.cursor/plans/` | This directory — Cursor IDE interactive planning                                   |

Prefer [`docs/plans/`](../../docs/plans/README.md) when the plan must survive
chats and feed the development loop. Keep using this directory when you are
planning inside Cursor's UI and do not need a multi-session Git SoT. When
ambiguous, ask the operator which surface to use.

Authoring persona:
[`project-planner`](../../.agents/agents/project-planner/agent.md).
Durable template: [`docs/plans/_template.md`](../../docs/plans/_template.md).

## When a plan lives here

- IDE-only / single-session planning in Cursor.
- The work is non-trivial but you do not need the agent loop to discover it yet.
- You want Cursor's planning UI visibility.

For multi-session how-work, find-work, or handoff to other agents, write under
[`docs/plans/`](../../docs/plans/README.md) instead.

Smaller, obvious changes do not need a plan doc — a chat-only sketch is fine.

## File convention

```
.cursor/plans/<slug>.md
```

Slug is `kebab-case` and reflects the work, not the date (e.g.
`migrate-immich-to-cnpg.md`). Prefer the durable template at
`docs/plans/_template.md` even when writing here, so surfaces stay compatible.

## Lifecycle

Plans are **living documents**:

- Updated as decisions change or new constraints surface.
- Kept in sync with reality during the work.
- **Delete-on-ship** when acceptance is met (same as `docs/plans/`); git is
  the archive. Optionally prune durable lessons into `docs/`,
  `.agents/memories/`, or wherever institutional knowledge belongs.

A stale plan is worse than no plan. If a plan no longer reflects how things
actually work, fix it or delete it.

## Current plans

_No plans yet. Prefer `docs/plans/` for durable work; use this directory for
Cursor IDE sessions._
