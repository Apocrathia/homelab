---
title: "Investigate slow pipelines"
canonical: https://tenzir.com/docs/guides/troubleshooting/investigate-slow-pipelines
source: https://tenzir.com/docs/guides/troubleshooting/investigate-slow-pipelines.md
section: "Docs"
---

# Investigate slow pipelines

> When a pipeline can’t keep up, you usually notice the symptoms first: a dashboard lags, a downstream system receives data late, or a backlog builds up. The node’s metrics tell you how fast the pipeline actually runs and which operator holds it back. This guide shows you how to measure both.

When a pipeline can’t keep up, you usually notice the symptoms first: a dashboard lags, a downstream system receives data late, or a backlog builds up. The node’s metrics tell you how fast the pipeline actually runs and which operator holds it back. This guide shows you how to measure both.

## Measure the throughput

For a first look, open the pipelines page at [app.tenzir.com](https://app.tenzir.com): it charts every pipeline’s activity without writing a query. For history and exact numbers, use the `pipeline` metric, where the node records how much data enters and leaves each pipeline every ten seconds. Look at the egress to see how many events the pipeline emits per window:

```tql
metrics "pipeline"
where pipeline_id == "827e46f0-134f-4b1f-b2a8-e450eeb809a8"
sort timestamp
tail 1
select timestamp, out_events=egress.events, out_bytes=egress.bytes, window=egress.duration
```

```tql
{
  timestamp: 2026-07-13T15:21:50Z,
  out_events: 183,
  out_bytes: 83907,
  window: 9.995304588s,
}
```

That’s 183 events over a 10-second window, or roughly 18 events per second. Compare the number against what the pipeline should sustain: if it sits far below the rate at which data arrives, the pipeline is the bottleneck. The metric also carries an `ingress` record with the same fields. When egress stays persistently below ingress, the pipeline can’t keep pace with its input and a backlog is building inside it. Investigate that as described in [Investigate memory growth](investigate-memory-growth.md).

A slow pipeline isn’t always slow because of its own operators. Back pressure propagates upstream through the whole flow: when a subscribing pipeline can’t keep up, every pipeline publishing to that topic slows down to match instead of losing data. A single slow destination can therefore reduce the throughput of several connected pipelines at once. If the pipeline ends in `publish`, check the throughput of its subscribers first; if they’re slow too, find the operator that sets the pace as described in [Find the slow operator](investigate-slow-pipelines.md#find-the-slow-operator).

Note

The `pipeline` metric only covers pipelines deployed to the node. Ad-hoc CLI runs, such as `tenzir -e localhost '...'`, don’t emit it.

## Find the slow operator

A pipeline runs only as fast as its slowest operator. The `operator_profile` metric reports each operator’s CPU usage, so you can see where the time goes:

```tql
metrics "operator_profile"
where pipeline_id == "827e46f0-134f-4b1f-b2a8-e450eeb809a8"
where timestamp > now() - 1min
summarize name, cpu=mean(cpu), events_out=sum(events_out)
sort -cpu
```

```tql
{name: "read_suricata", cpu: 83.14370225217391, events_out: 13189}
{name: "sort", cpu: 46.69585038688524, events_out: 6650}
{name: "where", cpu: 15.484713830434785, events_out: 6317}
```

Read the two columns together:

* **One operator with high `cpu`**: that operator is compute-bound and sets the pace, such as an expensive transformation, a complex regex, or a context lookup. Everything upstream and downstream waits for it.
* **All operators with low `cpu`**: nothing is compute-bound, so the pipeline waits on something external, such as a slow source, a rate-limited API, or a destination that can’t keep up. The operator with data piling up at its input points at which side; find it as described in [Investigate memory growth](investigate-memory-growth.md#find-where-data-piles-up).

If your node is connected to the Tenzir Platform, the **Insights** tab on the pipeline’s page visualizes per-operator CPU and queue fill without writing a query.

## Tune once you know the cause

Once you know whether the pipeline is compute-bound, input-bound, or output-bound, address it:

* **Compute-bound**: check the pipeline for avoidable work first; see the performance considerations in [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md#performance-considerations). If the pipeline is already minimal, spread the work across parallel pipelines. See [Load-balance pipelines](../route/load-balance-pipelines.md).
* **Throughput limited by batching or buffering**: adjust the relevant knobs. See [Tune performance](../node-setup/tune-performance.md).

## See also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
* [Investigate memory growth](investigate-memory-growth.md)
* [Tune performance](../node-setup/tune-performance.md)
* [Load-balance pipelines](../route/load-balance-pipelines.md)
