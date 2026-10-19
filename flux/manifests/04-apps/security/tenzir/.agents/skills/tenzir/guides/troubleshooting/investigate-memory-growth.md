---
title: "Investigate memory growth"
canonical: https://tenzir.com/docs/guides/troubleshooting/investigate-memory-growth
source: https://tenzir.com/docs/guides/troubleshooting/investigate-memory-growth.md
section: "Docs"
---

# Investigate memory growth

> When a node’s memory usage keeps climbing, you want to know whether it will level off or end in an out-of-memory kill, and which pipeline is responsible. This guide shows you how to find out using the node’s own metrics.

When a node’s memory usage keeps climbing, you want to know whether it will level off or end in an out-of-memory kill, and which pipeline is responsible. This guide shows you how to find out using the node’s own metrics.

## Confirm the growth

The node samples its memory usage once per second and stores the history durably. Compare the process’s usage with what the machine has available to see how much headroom is left:

```tql
metrics "memory"
where timestamp > now() - 2h
sort timestamp
select timestamp, process_bytes=process.current_bytes,
  system_used=system.used_bytes, system_total=system.total_bytes
```

```tql
{
  timestamp: 2026-07-01T21:43:51.297534179Z,
  process_bytes: 861966336,
  system_used: 7531401216,
  system_total: 8321515520,
}
```

The shape of the curve narrows down the cause. A steady climb that never comes down points at data accumulating somewhere inside the node. A sawtooth (climb, sharp drop, climb again) means the process is already being killed and restarted; in that case, first confirm the kill as described in [Check for unexpected restarts](../observability/inspect-a-node.md#check-for-unexpected-restarts). To see the shape at a glance, plot the data as described in [Plot data with charts](../../tutorials/plot-data-with-charts.md).

## Find where data piles up

The most common cause of growing memory is a backlog: one operator processes data slower than it arrives, so events pile up in front of it. Every operator reports how many bytes are waiting at its input, so you can find the bottleneck directly:

```tql
metrics "operator_profile"
where timestamp > now() - 10min
summarize pipeline_id, operator_id, name, buffered=max(input_bytes),
  events_out=sum(events_out), cpu=mean(cpu)
where buffered > 0
sort -buffered
```

```tql
{
  pipeline_id: "2db170f8-8fa0-42e4-b218-716bea8e5c8b",
  operator_id: "53/0-4/0-0/1",
  name: "read_suricata",
  buffered: 105405568,
  events_out: 30359,
  cpu: 88.17403167777779,
}
```

The operator with the largest `buffered` value is your bottleneck: everything upstream produces faster than this operator consumes. The other two columns tell you why:

* **`cpu` high compared to the other operators**: the operator is compute-bound; the transformation is more expensive than the data rate allows.
* **`cpu` near zero but `events_out` still moving**: the operator waits on something external that limits its pace, such as a rate-limited API or a slow destination.
* **`events_out` stuck at zero**: the operator makes no progress at all, for example because a remote service stopped responding.

Use the `pipeline_id` to find the pipeline in the Explorer. If your node is connected to the Tenzir Platform, you can also see this without writing a query: open the pipeline on the node’s page and switch to the **Insights** tab, which visualizes each operator’s queue fill and CPU usage from the same metrics.

By default, `metrics` reads history that the node has persisted. To watch a backlog develop in real time instead, for example right after restarting the suspect pipeline, subscribe to the live feed:

```tql
metrics "operator_profile", live=true
where input_bytes > 1M
select timestamp, pipeline_id, name, input_bytes
```

This streams one sample per second for every operator holding more than 1 MB at its input, until you stop the query.

Backlogs like this are self-limiting. An operator only runs when its downstream operators want more input, so a slow operator slows the entire pipeline down to its pace; this mechanism is called back pressure. Before it kicks in, the connection between two operators holds up to roughly 100 MiB, which is why the `buffered` value in the earlier output plateaus just above that mark. A pipeline with many operators can therefore hold several hundred megabytes of in-flight data, but a single backlog never grows without bounds.

If the bottleneck operator is healthy but too slow for the data rate, consider spreading the load across multiple pipelines. See [Load-balance pipelines](../route/load-balance-pipelines.md).

## Break down what the memory holds

If no pipeline shows a backlog, look at what the memory contains. The memory metric reports how much goes to in-memory event batches (`table_slices`) and raw byte buffers (`chunks`):

```tql
metrics "memory"
sort timestamp
tail 1
select timestamp, table_slices, chunks
```

```tql
{
  timestamp: 2026-07-01T21:43:51.297534179Z,
  table_slices: {
    serialized_bytes: 5712,
    non_serialized_bytes: 2235306,
    batch_count: 2942,
    event_count: 71055,
  },
  chunks: {
    bytes: 356576,
    count: 513,
  },
}
```

High `table_slices` numbers mean event data is held in memory: backlogs, buffers, or in-progress aggregations. If both stay low while the process keeps growing, the memory goes elsewhere, and the node can tell you where: it optionally collects per-allocator and per-component allocation statistics in the `tenzir.metrics.memory` schema. See [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md) for the full schema and the environment variables that enable the detailed collection.

If none of this explains the growth, capture the memory trend and the operator profile output and share them with Tenzir support, as described in [Inspect a node](../observability/inspect-a-node.md).

## See also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [Inspect a node](../observability/inspect-a-node.md)
* [Load-balance pipelines](../route/load-balance-pipelines.md)
* [Size a node](../node-setup/size-a-node.md)
