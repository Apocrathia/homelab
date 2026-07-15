# `.cursor/plans/` — Project plans

Living plan documents produced by the `project-planner` persona
(`.agents/agents/project-planner/agent.md`). Each plan captures a piece of work
from rough idea to actionable breakdown, and is updated as decisions evolve.

This directory is also Cursor's native plans surface — plans created here are visible to the IDE's planning UI.

## When a plan lives here

- The work is non-trivial (multi-step, touches multiple manifests, has tradeoffs worth recording).
- The idea needs requirements clarification before implementation can start.
- Decisions and rationale are worth keeping around for future agents and operators.

Smaller, obvious changes do not need a plan doc — a chat-only sketch is fine.

## File convention

```
.cursor/plans/<slug>.md
```

Slug is `kebab-case` and reflects the work, not the date (e.g. `migrate-immich-to-cnpg.md`, `add-grafana-loki.md`). The plan template lives in `.agents/agents/project-planner/agent.md`.

## Lifecycle

Plans are **living documents**:

- Updated as decisions change or new constraints surface.
- Kept in sync with reality during the work.
- After the work ships, prune to a short summary or move durable lessons to `docs/`, `.agents/memories/`, or wherever the institutional knowledge belongs.

A stale plan is worse than no plan. If a plan no longer reflects how things actually work, fix it or delete it.

## Current plans

_No plans yet. The `project-planner` agent will populate this directory as work is scoped._
