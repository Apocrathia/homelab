---
title: "Find cardinality spikes"
description: "Find windows where the number of distinct agent sessions exceeds its expected range."
canonical: https://tenzir.com/docs/guides/analyze/find-cardinality-spikes
source: https://tenzir.com/docs/guides/analyze/find-cardinality-spikes.md
section: "Docs"
---

# Find cardinality spikes

> Find windows where the number of distinct agent sessions exceeds its expected range.

Suppose an orchestrator emits seven coding-agent events in each five-minute window. The baseline window contains three agent sessions because several events belong to the same conversations. The current window contains seven sessions. Event volume has not changed, but the agent fan-out has more than doubled. An intended parallel rollout, a retry loop that keeps starting agents, and misuse of an automation credential can all produce this shape.

To expose the fan-out, measure session [cardinality](https://en.wikipedia.org/wiki/Cardinality), the number of distinct sessions, rather than counting all events. The [OCSF AI Operation profile](https://schema.ocsf.io/profiles/ai_operation) adds the `ai_agent` object to supported events. Our Codex and Claude Code packages populate `ai_agent.instance_uid` with the conversation or session identifier when the source reports one. The same identifier can appear when an Authorize Session event starts a session and when later API Activity records its work.

## Estimate distinct sessions

A session can produce many lifecycle events, so count each `ai_agent.instance_uid` once per window. The [`hll`](https://tenzir.com/docs/reference/functions/hll.md) function builds a [HyperLogLog](https://en.wikipedia.org/wiki/HyperLogLog) estimate without retaining every identifier, and [`hll_cardinality`](https://tenzir.com/docs/reference/functions/hll_cardinality.md) reads that estimate:

```tql
from {
  window: "normal",
  events: [
    {class_name: "Authorize Session", ai_agent: {instance_uid: "conversation-1"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "conversation-1"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "conversation-1"}},
    {class_name: "Authorize Session", ai_agent: {instance_uid: "session-1"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "session-1"}},
    {class_name: "Authorize Session", ai_agent: {instance_uid: "session-2"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "session-2"}},
  ],
}, {
  window: "current",
  events: [
    {class_name: "Authorize Session", ai_agent: {instance_uid: "conversation-1"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "conversation-2"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "conversation-3"}},
    {class_name: "Authorize Session", ai_agent: {instance_uid: "session-1"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "session-2"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "session-3"}},
    {class_name: "API Activity", ai_agent: {instance_uid: "session-4"}},
  ],
}
model = hll(events.map(event => event.ai_agent.instance_uid))
active_sessions = hll_cardinality(model)
select window, active_sessions
```

```tql
{window: "normal", active_sessions: 3}
{window: "current", active_sessions: 7}
```

Both windows contain seven events. The first estimate is three sessions and the second is seven, which exposes the change that an event count misses. In a live pipeline, construct one estimate per operational window:

```tql
where ai_agent.instance_uid? != null
window size=5min, on=time, tolerance=30s {
  summarize agent=ai_agent.name,
            sessions=hll(ai_agent.instance_uid)
  active_sessions = hll_cardinality(sessions)
  start = $window.start
  end = $window.end
}
```

The outer [`window`](https://tenzir.com/docs/reference/operators/window.md) bounds both the observation interval and the model state. Group inside it when you need one estimate per agent runtime, model, tenant, repository, or other workload key.

## Compare cardinality with a threshold

A HyperLogLog model estimates one window’s distinct population. Apply a known capacity bound directly when one exists:

```tql
where active_sessions > 10k
```

When expected activity differs by agent or time of day, retain a history of the per-window cardinality estimates and follow our guide on [setting adaptive thresholds](set-adaptive-thresholds-from-a-baseline.md). That second model captures how the estimate normally varies instead of treating every agent runtime as having the same limit.

Choose exact or approximate counting

Use [`count_distinct`](https://tenzir.com/docs/reference/functions/count_distinct.md) when the session population is small enough to retain and an exact answer matters. Use HyperLogLog when you need bounded state across many windows or grouping keys.

The `precision` argument controls the register count and estimation error. Its default of `14` allocates 16,384 registers per active estimate. Reduce it when you maintain many simultaneous groups and can tolerate more error. Increase it only when the decision boundary needs the additional accuracy.

## See also

* [Set adaptive thresholds from a baseline](set-adaptive-thresholds-from-a-baseline.md)
* [Window event streams](window-event-streams.md)
