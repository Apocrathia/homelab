---
title: "subscribe"
canonical: https://tenzir.com/docs/reference/operators/subscribe
source: https://tenzir.com/docs/reference/operators/subscribe.md
section: "Docs"
---

# subscribe

> Subscribes to events from a channel with a topic.

Subscribes to events from a channel with a topic.

```tql
subscribe [topic:string...]
```

## Description

The `subscribe` operator subscribes to events from a channel with the specified topic. Multiple `subscribe` operators with the same topic receive the same events.

Subscribers propagate back pressure to publishers. If a subscribing pipeline fails to keep up, all publishers will slow down as well to a matching speed to avoid data loss. This mechanism is disabled for pipelines that are not visible on the overview page on [app.tenzir.com](https://app.tenzir.com), which drop data rather than slow down their publishers.

During node shutdown, `subscribe` waits for `publish` to drain all data before shutting down itself. This prevents data loss, as long as pub/sub do not form cycles and `publish` does not use dynamic topic names.

When you stop an individual subscribing pipeline, `subscribe` first detaches from future publications, then drains the events it has already accepted. It does not wait for publishers to stop.

### `topic: string... (optional)`

Optional channel names to subscribe to. If unspecified, the operator subscribes to the topic `main`.

## Optimizations

The operator acts on the predicates that the [optimizer](../../explanations/pipeline.md#optimization) pushes toward it. A [`where`](https://tenzir.com/docs/reference/operators/where.md) that follows `subscribe` becomes part of the subscription, and the node drops non-matching events before they enter the pipeline. This keeps back pressure and the per-pipeline queues limited to events the pipeline actually processes.

A predicate translates when it compares a field or the `@name` metadata with a literal, uses `in` with a list or a subnet, or combines such comparisons with `and`, `or`, and `not`. Predicates that call functions run in the operator instead.

The operator does not act on limits or field selections.

## Examples

### Subscribe to the events under a topic

```tql
subscribe "zeek-conn"
```

### Subscribe to the multiple topics

```tql
subscribe "alerts", "notices", "critical"
```

## See Also

* [`export`](https://tenzir.com/docs/reference/operators/export.md)
* [`publish`](https://tenzir.com/docs/reference/operators/publish.md)
* [Quickstart](../../guides/quickstart.md)
* [Split and merge streams](../../guides/route/split-and-merge-streams.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
