---
title: "Split and merge streams"
canonical: https://tenzir.com/docs/guides/route/split-and-merge-streams
source: https://tenzir.com/docs/guides/route/split-and-merge-streams.md
section: "Docs"
---

# Split and merge streams

> This guide shows you how to connect pipelines using publish and subscribe operators. You’ll learn to split event streams for parallel processing and merge multiple sources into a single pipeline, both across pipelines and within a single one.

This guide shows you how to connect pipelines using [`publish`](https://tenzir.com/docs/reference/operators/publish.md) and [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md) operators. You’ll learn to split event streams for parallel processing and merge multiple sources into a single pipeline, both across pipelines and within a single one.

Tenzir gives you two ways to split and merge streams. Publish/subscribe topics connect *separate* pipelines on the same node, which is what you want when the producers and consumers have independent lifetimes or when you add and remove consumers over time. Topics are node-local, so crossing node boundaries needs an external broker such as Kafka or NATS instead, as the guide on how to [send to destinations](send-to-destinations.md) shows. The [`fork`](https://tenzir.com/docs/reference/operators/fork.md) and [`merge`](https://tenzir.com/docs/reference/operators/merge.md) operators split and merge *inside* a single pipeline, which keeps a self-contained flow in one place: `fork` attaches an extra sink that consumes a copy of the stream, and `merge` attaches an extra source that contributes events into the stream.

## How publish/subscribe works

The [`publish`](https://tenzir.com/docs/reference/operators/publish.md) operator sends events to a named channel (topic) on a node. The [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md) operator receives events from that channel. Multiple subscribers can receive the same events, and multiple publishers can write to the same topic.

```tql
// Publisher pipeline
from_file "events.json"
publish "events"
```

A separate pipeline subscribes to receive these events:

```tql
// Subscriber pipeline
subscribe "events"
to_splunk "https://splunk:8088", hec_token=secret("HEC_TOKEN")
```

## Fan-out: split streams

Send the same events to multiple destinations by having multiple subscribers:

### Multiple subscribers on one topic

```tql
// Pipeline 1: Ingest and publish
from_file "/var/log/*.json", watch=10s
publish "logs"
```

One subscriber archives events to storage:

```tql
// Pipeline 2: Archive to storage
subscribe "logs"
import
```

Another forwards only high-severity events to a SIEM:

```tql
// Pipeline 3: Forward to SIEM
subscribe "logs"
where severity in ["high", "critical"]
to_splunk "https://splunk:8088", hec_token=secret("HEC_TOKEN")
```

A third sends authentication failures to a dedicated alerting channel:

```tql
// Pipeline 4: Real-time alerting
subscribe "logs"
where event_type == "auth" and outcome == "failure"
to_kafka "alerts"
```

All subscriber pipelines receive the same events independently.

### Route with event labels

An upstream pipeline can attach OCSF labels when downstream routing needs an event-level classification but not a security judgment. This classifier sends production endpoint events to deeper analysis and treats lab endpoint events as noise. The `add` function preserves existing labels and avoids duplicates:

```tql
// Upstream classification pipeline
if device.hostname?.starts_with("prod-") {
  metadata.labels = metadata.labels.add("deep-analysis")
} else if device.hostname?.starts_with("lab-") {
  metadata.labels = metadata.labels.add("noise")
}
publish "classified-events"
```

Later subscribers can act on either label independently of the classifier:

```tql
// Send production endpoint events to deeper analysis.
subscribe "classified-events"
where "deep-analysis" in metadata.labels?
to_kafka "deep-analysis"
```

```tql
// Archive lab endpoint noise separately.
subscribe "classified-events"
where "noise" in metadata.labels?
to_file "noise.jsonl" { write_ndjson }
```

`metadata.labels` classifies the event for consumers. It does not express that the event may require immediate attention. To make that judgment, follow the guide to [tag an event as an alert](../detect/model-detections-in-ocsf.md#tag-an-event-as-an-alert).

### Dynamic topics

Route events to different topics based on content:

```tql
from_file "eve.json" {
  read_suricata
}
publish f"suricata.{event_type}"
```

Subscribers can then listen to specific event types:

```tql
// Only DNS events
subscribe "suricata.dns"
```

Or subscribe to alerts only:

```tql
// Only alert events
subscribe "suricata.alert"
```

### Split within a single pipeline

When one pipeline owns both branches, [`fork`](https://tenzir.com/docs/reference/operators/fork.md) sends a copy of every event into a subpipeline while the main stream continues unchanged. This archives all events and keeps only the high-severity ones for the SIEM, without a second pipeline and without a topic in between:

```tql
from_file "/var/log/*.json", watch=10s
fork {
  to_file "/tmp/tenzir/archive.json" { write_ndjson }
}
where severity in ["high", "critical"]
to_splunk "https://splunk:8088", hec_token=secret("HEC_TOKEN")
```

The subpipeline must end in a sink, so its events never rejoin the main stream. Use [`fork_merge`](https://tenzir.com/docs/reference/operators/fork_merge.md) when you want both branches to transform the events and then feed their results back into one stream. To send events into subpipelines per event or per key instead of branching by purpose, the guide on how to [fan out with subpipelines](fan-out-with-subpipelines.md) compares `fork` with [`each`](https://tenzir.com/docs/reference/operators/each.md) and [`group`](https://tenzir.com/docs/reference/operators/group.md).

## Fan-in: merge streams

Combine multiple sources into a single stream by publishing to the same topic:

```tql
// Pipeline 1: Zeek logs
from_file "/var/log/zeek/*.log", watch=10s {
  read_zeek_tsv
}
publish "network"
```

A second pipeline publishes Suricata alerts to the same topic:

```tql
// Pipeline 2: Suricata alerts
from_file "/var/log/suricata/eve.json", watch=10s {
  read_suricata
}
publish "network"
```

A third pipeline consumes the merged stream:

```tql
// Pipeline 3: Consume merged stream
subscribe "network"
import
```

The subscriber receives events from both Zeek and Suricata in a single stream.

### Merge within a single pipeline

The dual of `fork` is [`merge`](https://tenzir.com/docs/reference/operators/merge.md), which runs a subpipeline that starts with its own source and interleaves the events it produces into the stream. Reach for it when a single pipeline needs to pull in a second input, such as combining two files that a downstream sink should receive as one stream:

```tql
from_file "/var/log/suricata/eve.json" {
  read_suricata
}
merge {
  from_file "/var/log/zeek/*.log" {
    read_zeek_tsv
  }
}
to_splunk "https://splunk:8088", hec_token=secret("HEC_TOKEN")
```

Because both sources run concurrently, the order in which their events appear in the output is undefined. Both sources here are bounded, so a downstream [`sort`](https://tenzir.com/docs/reference/operators/sort.md) can restore an order such as by timestamp. Unlike the publish/subscribe variant above, the merged inputs share one pipeline: they start, stop, and fail together, and no topic is involved.

## Subscribe to multiple topics

A single subscriber can listen to multiple topics:

```tql
subscribe "alerts", "notices", "critical"
to_kafka "all-priority-events"
```

## Shutdown guarantees

On shutdown, Tenzir drains in-flight publish/subscribe data before it stops pipelines. This guarantee is strongest when you use fixed topic names and an acyclic pipeline graph.

Avoid cyclic publish/subscribe topologies. If a pipeline publishes back into a stream that eventually feeds the same pipeline again, Tenzir can’t guarantee a fully graceful drain and may drop data during shutdown.

There is also a small probability of data loss during shutdown when using dynamic topics. In practice, this is likely to happen only for newly started nodes or newly observed topics during shutdown.

## Combine both approaches

The two mechanisms compose: a `fork` subpipeline can publish its copy to a topic, which hands the branch off to any number of independent subscribers while the main pipeline keeps processing:

```tql
from_file "events.json"
fork {
  publish "raw-events"
}
// Continue processing in main pipeline
where severity in ["high", "critical"]
import
```

Likewise, a `merge` subpipeline can subscribe to a topic to blend a shared stream into a pipeline’s own input.

## Back pressure behavior

Subscribers propagate back pressure to publishers. If a subscribing pipeline can’t keep up, publishers slow down to match, preventing data loss.

Pipelines not visible on the overview page at [app.tenzir.com](https://app.tenzir.com) drop data instead of slowing publishers. This prevents slow ad-hoc queries from blocking production pipelines.

## See also

* [Send to destinations](send-to-destinations.md)
* [Fan out with subpipelines](fan-out-with-subpipelines.md)
* [Load-balance pipelines](load-balance-pipelines.md)
* [`publish`](https://tenzir.com/docs/reference/operators/publish.md)
* [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md)
* [`fork`](https://tenzir.com/docs/reference/operators/fork.md)
* [`fork_merge`](https://tenzir.com/docs/reference/operators/fork_merge.md)
* [`merge`](https://tenzir.com/docs/reference/operators/merge.md)
