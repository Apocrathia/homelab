---
title: "batch"
canonical: https://tenzir.com/docs/reference/operators/batch
source: https://tenzir.com/docs/reference/operators/batch.md
section: "Docs"
---

# batch

> The batch operator controls the batch size of events.

The `batch` operator controls the batch size of events.

```tql
batch [limit:int, timeout=duration]
```

## Description

The `batch` operator takes its input and rewrites it into batches of up to the desired size.

Advanced feature

The `batch` operator is a lower-level building block that lets users explicitly control batching, which otherwise is controlled automatically by Tenzir’s underlying pipeline execution engine. Use with caution!

The operator collects events of any schema into a single buffer, preserving their order. It flushes the buffer immediately when it reaches the `limit`.

### `limit: int (optional)`

How many events to put into one batch at most.

Defaults to `8192`.

### `timeout = duration (optional)`

Specifies a maximum latency for events passing through the batch operator. If no new events arrive within the timeout period, any buffered events are flushed.

Defaults to `1min`.
