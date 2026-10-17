---
title: "Replay historical events"
description: "Run stored events through live pipelines with controlled timestamps, pacing, and side effects"
canonical: https://tenzir.com/docs/guides/replay/replay-historical-events
source: https://tenzir.com/docs/guides/replay/replay-historical-events.md
section: "Docs"
---

# Replay historical events

> Run stored events through live pipelines with controlled timestamps, pacing, and side effects

Replay sends stored events through a pipeline again. Use it to test a changed detection against a past incident, validate a mapping fix, reproduce a bug, or demonstrate a live pipeline without waiting for new telemetry.

A replay has three independent time decisions:

* Whether to put events in timestamp order.
* Whether to preserve or rewrite their timestamps.
* Whether to emit them immediately or reproduce the gaps between them.

This guide builds a replay pipeline from those decisions and keeps its output separate from live data.

## Choose the replay behavior

Start from the result you need:

| Goal                                                   | Pipeline step                    |
| ------------------------------------------------------ | -------------------------------- |
| Process a finite archive in exact timestamp order      | `sort time`                      |
| Process a large stream with bounded timestamp disorder | `reorder on=time, tolerance=...` |
| Keep the historical incident time                      | Do not use `timeshift`           |
| Move the incident to the current timeline              | `timeshift time, start=now()`    |
| Finish as fast as possible                             | Do not use `delay`               |
| Reproduce or scale the original cadence                | `delay time, speed=...`          |

Ordering, timestamp shifting, and pacing solve different problems. Include only the steps the replay requires.

## Read stored events

Begin with a finite source that produces structured events. This example reads OCSF Network Activity events from partitioned Parquet files:

```tql
from_file "s3://security-lake/ocsf/network/**/day=17/*.parquet" {
  read_parquet
}
```

The replay timestamp must have the `time` type. Follow the guide on [normalizing event timestamps](../shape/normalize-event-timestamps.md) when the archive contains strings, numeric epochs, or incomplete timestamps.

## Establish event-time order

Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) for a finite archive with arbitrary disorder:

```tql
sort time
```

Use [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md) when the input is large and its timestamp skew has a known bound:

```tql
reorder on=time, tolerance=2min
```

Archives assembled from producer shards, message-broker partitions, overlapping collector runs, or objects written in parallel often need this step. Skip it when the source guarantees nondecreasing timestamps.

The guide on [repairing out-of-order events](../shape/repair-out-of-order-events.md) explains how to choose between `sort` and `reorder`, size the tolerance, and choose between global and per-key ordering.

## Preserve the incident timestamp

Keep the original timestamp when downstream logic should evaluate the historic period exactly as recorded. You can still anchor replay pacing to the current wall clock:

```tql
delay time, start=now(), speed=20.0
```

This leaves `time` unchanged. The first event emits at the current time, but it still carries its historical timestamp.

Copy the timestamp when you plan to rewrite it but still need the incident time for comparison or investigation:

```tql
original_time = time
```

Choose a field that fits the target schema. For OCSF, source-specific replay metadata can remain under `unmapped` if no standard attribute represents it.

## Move the replay to the current timeline

Use [`timeshift`](https://tenzir.com/docs/reference/operators/timeshift.md) when consumers expect event timestamps near the current time:

```tql
original_time = time
timeshift time, start=now()
```

The `timeshift` operator anchors the first timestamp at `start` and preserves the relative gaps between events. It changes timestamp values but does not wait between events.

Do not shift timestamps when testing logic that depends on the original calendar date, such as historical lookup state, date-partitioned routing, or rules tied to a specific maintenance window.

## Pace the replay

Without [`delay`](https://tenzir.com/docs/reference/operators/delay.md), the pipeline runs as fast as its source and operators permit. This is appropriate for batch validation, backfills, and tests whose logic uses event time exclusively.

Add `delay` when the system under test should observe the original event cadence:

```tql
delay time
```

Set `speed` above `1.0` to compress the replay duration. A value of `20.0` turns a 20-second timestamp gap into one second of wall-clock delay:

```tql
delay time, speed=20.0
```

Set `speed` below `1.0` to slow the replay down. Put `sort` or `reorder` before `delay` when timestamps can regress. `delay` emits a regression immediately instead of repairing its position in the sequence.

## Run a fast validation replay

Use a complete sort and omit timestamp shifting and pacing when you want a finite test to finish quickly while preserving the original event time:

```tql
from_file "s3://security-lake/ocsf/network/**/day=17/*.parquet" {
  read_parquet
}
sort time
publish "ocsf"
```

Every subscriber receives the archive as fast as the pipeline can process it. Event-time windows still evaluate the historical timestamps.

## Simulate a live stream

The following pipeline accepts up to two minutes of timestamp disorder, moves the incident to the current timeline, replays it at 20 times the original speed, and publishes it:

```tql
from_file "s3://security-lake/ocsf/network/**/day=17/*.parquet" {
  read_parquet
}
reorder on=time, tolerance=2min
original_time = time
timeshift time, start=now()
delay time, speed=20.0
publish "ocsf"
```

The glob can exceed the tolerance

The `from_file` URL reads every Parquet file under matching `day=17` directories. File order is not event-time order.

The `sort` operator waits for every file, then emits every event in timestamp order. The `reorder` operator can emit before reading ends, which makes it usable for large or live inputs. The tradeoff is dropped data. If a later file contains an event whose timestamp precedes output already emitted, `reorder` drops it with a warning. Use `sort time` when you need every event or cannot bound disorder across the files.

For finite input with unbounded disorder, replace `reorder` with `sort time`. Remove `timeshift` when consumers should see the historical event time. Remove `delay` when wall-clock pacing does not matter.

## Isolate replay side effects

Send output to a dedicated topic or non-production destination. A replayed alert, context update, notification, or ticket can otherwise be indistinguishable from a live one.

Add an explicit marker when downstream pipelines need to distinguish replayed events:

```tql
replay = {
  active: true,
  run_id: "incident-2024-01-17",
}
```

Branch on that marker before any sink with external effects. Do not rely only on the topic name after events leave Tenzir.

## Account for wall-clock state

Event-time windows follow the event timestamps after any `timeshift`. Wall-clock mechanisms follow the actual replay runtime. This includes:

* Processing-time windows.
* `now()` calls.
* Window `idle_timeout`.
* Context expiration.
* [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md) timeouts.

A fast replay can compress incidents that were hours apart into one wall-clock suppression interval. Disable such suppression for the replay, adjust its timeout, or accept the compressed behavior as part of the test.

## Check the run

Inspect warnings and output before connecting the replay to its intended consumers. In particular:

* The `reorder` operator warns about invalid timestamps and events whose timestamps precede output it has already emitted.
* `timeshift` should preserve the expected gaps and the copied original time.
* `delay` should produce the intended wall-clock duration at the selected speed.
* Replay markers should reach every branch that can cause an external effect.

## See also

* [Normalize event timestamps](../shape/normalize-event-timestamps.md)
* [Repair out-of-order events](../shape/repair-out-of-order-events.md)
* [Window event streams](../analyze/window-event-streams.md)
* [Detect over time windows](../detect/detect-over-time-windows.md)
