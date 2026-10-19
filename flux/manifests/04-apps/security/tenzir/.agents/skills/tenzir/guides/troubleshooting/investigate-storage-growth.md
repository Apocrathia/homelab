---
title: "Investigate storage growth"
canonical: https://tenzir.com/docs/guides/troubleshooting/investigate-storage-growth
source: https://tenzir.com/docs/guides/troubleshooting/investigate-storage-growth.md
section: "Docs"
---

# Investigate storage growth

> When the disk fills up on a machine that runs a node, you want to know whether the node is responsible, which data takes the space, and how to cap it. This guide shows you how to answer all three from within the node.

When the disk fills up on a machine that runs a node, you want to know whether the node is responsible, which data takes the space, and how to cap it. This guide shows you how to answer all three from within the node.

## Check the volume

The node samples the disk usage of the filesystem that holds its state directory once per second. The `path` field tells you which filesystem the numbers refer to:

```tql
metrics "disk"
where timestamp > now() - 7d
sort timestamp
select timestamp, path, used_bytes, free_bytes
```

```tql
{
  timestamp: 2026-07-01T21:45:51.257284429Z,
  path: "/var/lib/tenzir",
  used_bytes: 61646446592,
  free_bytes: 423827537920,
}
```

This shows how fast the volume fills up, but it measures the whole filesystem, so other processes writing to the same volume show up here too. To see what the node itself stores, look at its partitions.

## Find what takes the space

Events stored at the node live in partitions. The [`partitions`](https://tenzir.com/docs/reference/operators/partitions.md) operator reports the disk usage of every partition, so you can rank schemas by what they cost you:

```tql
partitions
summarize schema, internal=any(internal), partitions=count(),
  events=sum(events), diskusage=sum(diskusage)
sort -diskusage
head 5
```

```tql
{
  schema: "tenzir.metrics.memory",
  internal: true,
  partitions: 5,
  events: 23792,
  diskusage: 559776,
}
{
  schema: "tenzir.metrics.caf",
  internal: true,
  partitions: 5,
  events: 23792,
  diskusage: 174720,
}
```

Two things to read from the output:

* **`internal: true`** marks the node’s own data: metrics and diagnostics. The node collects these continuously, so they grow even when you don’t import anything. Retention settings cap them, as described later in this guide.
* **Your schemas** show what imported data costs. The `store.url` field of each partition points at the backing file in the state directory, if you want to verify sizes on disk.

To explore what the stored data contains, see [Show available schemas](../store/show-available-schemas.md).

## Cap the growth

The node’s own metrics and diagnostics have configurable retention. The defaults keep metrics for 16 days and diagnostics for 30 days:

tenzir.yaml

```yaml
tenzir:
  retention:
    metrics: 7d
    diagnostics: 14d
```

Caution

Short retention periods degrade pipeline activity and diagnostics views in the Tenzir Platform, and they limit how far back you can look when troubleshooting; the restart and memory investigations in this section rely on metrics history.

For imported data, the node can delete or transform old events automatically, either when a disk budget is exceeded or after a retention span. See [Transform data at rest](../store/transform-data-at-rest.md) for the available strategies, including manual compaction.

## See also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [`partitions`](https://tenzir.com/docs/reference/operators/partitions.md)
* [Show available schemas](../store/show-available-schemas.md)
* [Transform data at rest](../store/transform-data-at-rest.md)
* [Inspect a node](../observability/inspect-a-node.md)
