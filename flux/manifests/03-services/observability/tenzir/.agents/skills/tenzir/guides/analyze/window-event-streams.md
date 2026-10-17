---
title: "Window event streams"
canonical: https://tenzir.com/docs/guides/analyze/window-event-streams
source: https://tenzir.com/docs/guides/analyze/window-event-streams.md
section: "Docs"
---

# Window event streams

> Use window when an aggregation needs time or event-count boundaries. Tumbling and hopping windows create one subpipeline per aligned range. By default, trailing windows create one subpipeline per event. Set every or trigger to restrict which events fire one. Session windows keep one subpipeline open while consecutive events remain within an inactivity gap. Inside any form, use summarize to compute counts, distinct values, and statistics.

Use [`window`](https://tenzir.com/docs/reference/operators/window.md) when an aggregation needs time or event-count boundaries. Tumbling and hopping windows create one subpipeline per aligned range. By default, trailing windows create one subpipeline per event. Set `every` or `trigger` to restrict which events fire one. Session windows keep one subpipeline open while consecutive events remain within an inactivity gap. Inside any form, use [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) to compute counts, distinct values, and statistics.

The model covers eight `size`-based combinations plus inactivity-defined sessions. The left column shows duration windows, while the right column shows event-count windows. Blue marks fixed windows, green marks trailing windows, and purple marks sessions. Highlighted events show the reduced firing cadence of sampled trailing windows.

Nine timeline diagrams compare tumbling, hopping, trailing per-event, sampled trailing, and session windows over time and event counts. Blue fixed windows partition or overlap the timeline. Green trailing windows end at events. A purple session example groups events at 0, 4, and 8 minutes, then starts a new session after a seven-minute gap.

For duration windows, specify `on` to assign events by event time and accept out-of-order data with `tolerance`. Fixed windows delay closure by the tolerance but pass events to their subpipelines in arrival order. Trailing and session windows reorder events within that tolerance before evaluating event order. Omit `on` for processing-time windows that close on their wall-clock boundary. Use an integer `size` for windows that close after a number of events rather than an amount of time.

Put [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md) before a fixed window only when its subpipeline needs timestamp order, for example to collect an activity sequence. The guide on [repairing out-of-order events](../shape/repair-out-of-order-events.md) explains when to use `reorder`, a complete `sort`, or window tolerance alone.

Use `gap` to select a session when inactivity defines the population. An event-time session continues while the distance between consecutive events stays within `gap`, so its total duration can exceed the gap. An optional `size` caps its total duration or event count. A processing-time session closes at the wall-clock gap deadline. Compose an outer [`group`](https://tenzir.com/docs/reference/operators/group.md) with the session window when each key needs its own session:

```tql
group host {
  window gap=5min, on=time {
    summarize events=count()
    host = $group
  }
}
```

Put [`group`](https://tenzir.com/docs/reference/operators/group.md) outside [`window`](https://tenzir.com/docs/reference/operators/window.md) only when each key needs its own event-time clock, trailing history, or session. For aligned fixed detections, an outer `window` with groups inside usually bounds high-cardinality state more predictably.

For complete streaming detections built on these mechanics, such as brute-force login thresholds and statistical traffic-spike baselines with alert suppression, follow the guide on [detecting over time windows](../detect/detect-over-time-windows.md).

## Group activity into session windows

Session windows model bursts whose boundaries come from inactivity rather than an aligned clock. The first event opens a session. Each later event joins it while the gap from the previous event stays within `gap`. The session can last much longer than `gap` if activity continues. Output preserves session order, so a later session cannot overtake an earlier one when their subpipelines finish concurrently.

### Build per-key event-time sessions

Put [`group`](https://tenzir.com/docs/reference/operators/group.md) outside [`window`](https://tenzir.com/docs/reference/operators/window.md) so each key gets an independent session and event-time clock. This example emits destinations with at least five events in one activity burst:

```tql
group dest {
  window gap=5min,
         size=24h,
         on=time,
         tolerance=2min {
    summarize eventcount=count(), session_end=max(time)
    session_start = $window.start
    duration = session_end - session_start
    dest = $group
    where eventcount >= 5
  }
}
```

The `tolerance` buffer orders events before assigning them to sessions. Events that arrive behind the finalized watermark are dropped with a warning. Set `idle_timeout` when an event-time session must close after wall-clock inactivity even if no later timestamp advances its watermark.

### Use processing-time sessions

Omit `on` when arrival time defines activity. The operator closes a processing-time session on its wall-clock gap timer, even if no later event arrives:

```tql
group connection_id {
  window gap=30s, size=10min {
    summarize eventcount=count()
    connection_id = $group
  }
}
```

Processing-time sessions reject `tolerance` and `idle_timeout`. The gap timer already provides wall-clock closure.

### Bound long-running sessions

A busy session has no natural duration or event-count limit. Set `size` to a duration or integer to split it before the inactivity gap expires. A session accepts one cap at a time.

This event-time session closes after 1,000 events:

```tql
group dest {
  window gap=5min, size=1000, on=time {
    summarize eventcount=count()
    dest = $group
  }
}
```

The event that reaches an integer `size` belongs to the closing session. A session also includes an event that lands exactly on a duration `size` boundary, on either clock; without such an arrival, a processing-time session closes on its wall-clock duration deadline. The cap limits the session subpipeline’s lifetime. It doesn’t impose a hidden cap on state inside the subpipeline, so choose bounded aggregates when input cardinality can grow without limit.

### Migrate from Splunk `transaction`

The inactivity subset of Splunk’s [`transaction` command](https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.4/search-commands/transaction) maps approximately to an outer [`group`](https://tenzir.com/docs/reference/operators/group.md) and a session [`window`](https://tenzir.com/docs/reference/operators/window.md). For example, this SPL search groups each destination until a five-minute pause:

```spl
…
| sort 0 -_time
| transaction dest maxpause=5m maxspan=24h maxevents=1000
| where eventcount >= 5
```

The closest TQL translation makes the output fields explicit:

```tql
sort time
group dest {
  window gap=5min,
         size=24h,
         on=time {
    summarize eventcount=count(), session_end=max(time)
    session_start = $window.start
    duration = session_end - session_start
    dest = $group
    where eventcount >= 5
  }
}
```

The core options map as follows:

| Splunk `transaction`              | TQL session window                                   |
| --------------------------------- | ---------------------------------------------------- |
| One grouping field such as `dest` | `group dest { … }`                                   |
| `maxpause=5m`                     | `window gap=5min`                                    |
| `maxspan=24h`                     | Approximate duration cap `size=24h`                  |
| `maxevents=1000`                  | Approximate event-count cap `size=1000`              |
| Generated `eventcount`            | `summarize eventcount=count()`                       |
| Generated `duration`              | Subtract the first timestamp from the last timestamp |
| `mvlist` or `mvraw`               | Use `collect` for the fields you need to retain      |

One TQL session window accepts either the duration cap or the event-count cap, not both. The example approximates `maxspan=24h` with a duration `size`. Use `size=1000` instead when Splunk’s default `maxevents` bound matters. Splunk also requires descending timestamp order for `maxpause` and `maxspan`. The leading `sort time` mirrors that complete sort for finite input, but puts events in the nondecreasing order required by the default `tolerance=0s`. It buffers the full input. For an unbounded stream, omit `sort` and set `tolerance` to the maximum expected lateness. Tenzir drops events that arrive beyond that bound with a warning.

Check transaction semantics before translating

Multiple fields in Splunk `transaction` can connect events through transitive field matches. A TQL record key such as `group {host, cookie}` instead groups by an exact tuple. Splunk’s `startswith`, `endswith`, `connected`, orphan, and eviction options also have no direct session-window equivalent.

Caps anchor at opposite ends of the input. Splunk processes events from newest to oldest, while the TQL session processes them from oldest to newest after `sort time`. Given events at hours 0, 23, and 25 with no inactivity split, `maxspan=24h` groups hours 23 and 25 in Splunk. The TQL duration `size=24h` groups hours 0 and 23 instead. Event-count caps can differ at the partial group for the same reason.

The maximum-duration boundary also differs. Splunk requires a transaction’s span to stay strictly below `maxspan`. A TQL event-time session includes the event that reaches its duration `size` and then closes. Treat capped translations as approximate unless the cap never determines a boundary.

Unlike `transaction`, a session window doesn’t merge raw events or union all fields automatically. Its subpipeline determines the result. Use [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) for compact statistics and the [`collect`](https://tenzir.com/docs/reference/functions/collect.md) function only for evidence that you need downstream.

## Compare TQL with KQL, SPL, and Cribl Stream

The following sections compare aggregation and windowing capabilities across TQL, Microsoft KQL, Splunk SPL, and Cribl Stream. They cover Tenzir’s [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md), [`every`](https://tenzir.com/docs/reference/operators/every.md), [`group`](https://tenzir.com/docs/reference/operators/group.md), and [`window`](https://tenzir.com/docs/reference/operators/window.md) operators. Cribl Stream entries refer to pipeline Functions, especially [Aggregations](https://docs.cribl.io/stream/aggregations-function/), not Cribl Search.

### Complete-input aggregation

Complete-input aggregation waits for the full input and then emits final aggregate results. Use it for batch summaries where intermediate updates and event-time boundaries do not matter.

| System       | Support | Notes                                                                                                  |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------ |
| TQL          | ✅       | [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) consumes the input by default. |
| KQL          | ✅       | Use `summarize`.                                                                                       |
| SPL          | ✅       | Use `stats`.                                                                                           |
| Cribl Stream | ⚠️      | Aggregations are time-windowed.                                                                        |

### Grouped aggregation

Grouped aggregation computes separate aggregate results for each key, such as one count per user or host. The grouping key partitions aggregate state, but it does not add time boundaries unless you combine it with a windowing mechanism.

| System       | Support | Notes                                                                                             |
| ------------ | ------- | ------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) with grouping fields. |
| KQL          | ✅       | Use `summarize ... by key`.                                                                       |
| SPL          | ✅       | Use `stats ... BY key`.                                                                           |
| Cribl Stream | ⚠️      | Use time-windowed `Group by fields`.                                                              |

### Periodic processing-time aggregation

Periodic processing-time aggregation emits results on a wall-clock or processing-time cadence. Use it for live dashboards and operational metrics when arrival time matters more than event timestamps.

| System       | Support | Notes                                                                                                                                                                                                                                                                 |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) without `on`, [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) `options={emit: 30s, mode: "reset"}`, or [`every`](https://tenzir.com/docs/reference/operators/every.md). |
| KQL          | ⚠️      | Use scheduled or continuous query patterns.                                                                                                                                                                                                                           |
| SPL          | ⚠️      | Use real-time or scheduled searches.                                                                                                                                                                                                                                  |
| Cribl Stream | ⚠️      | Use Scheduled Collectors; Aggregations use event-time buckets.                                                                                                                                                                                                        |

### Periodic running stats

Periodic running stats emit accumulated values repeatedly instead of waiting for the stream to end. They show the total so far, not a bounded rolling lookback.

| System       | Support | Notes                                                                                                                  |
| ------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) `options={emit: 30s, mode: "cumulative"}`. |
| KQL          | ⚠️      | Use scheduled or continuous query patterns.                                                                            |
| SPL          | ⚠️      | Use `streamstats` or scheduled searches.                                                                               |
| Cribl Stream | ⚠️      | Enable `Cumulative aggregations` in Aggregations.                                                                      |

### Wall-clock subpipeline batches

Wall-clock subpipeline batches rerun a block of work on a fixed schedule. This is useful when the work fetches or refreshes data, rather than grouping existing events by event time.

| System       | Support | Notes                                                                                            |
| ------------ | ------- | ------------------------------------------------------------------------------------------------ |
| TQL          | ✅       | Use [`every`](https://tenzir.com/docs/reference/operators/every.md) to rerun an arbitrary block. |
| KQL          | ❌       | No direct query-language block equivalent.                                                       |
| SPL          | ❌       | No direct query-language block equivalent.                                                       |
| Cribl Stream | ⚠️      | Scheduled Collectors schedule collection work.                                                   |

### Tumbling event-time windows

Tumbling event-time windows split events into adjacent, non-overlapping time ranges based on event timestamps. Each event belongs to one window, and each window produces its own result.

| System       | Support | Notes                                                                                   |
| ------------ | ------- | --------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) `size=1h, on=ts`. |
| KQL          | ✅       | Use `summarize ... by bin(ts, 1h)`.                                                     |
| SPL          | ✅       | Use `timechart span=1h` or `bin _time`.                                                 |
| Cribl Stream | ✅       | Use Aggregations `Time window`.                                                         |

### Hopping event-time windows

Hopping event-time windows use a window size that is larger than the step between window starts. This gives rolling context with repeated overlapping windows, so one event can contribute to several results.

| System       | Support | Notes                                                                                             |
| ------------ | ------- | ------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) `size=1h, every=5m, on=ts`. |
| KQL          | ⚠️      | Use manual expansion or plugins for specific metrics.                                             |
| SPL          | ⚠️      | Use manual expansion or bucketing.                                                                |
| Cribl Stream | ❌       | No hopping window option.                                                                         |

### Fixed count windows

Fixed count windows close after a bounded number of arriving events rather than at a time boundary. They are useful for batching and sample-based analytics where batch boundaries must not affect the result.

| System       | Support | Notes                                                                                                     |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) `size=100` or `size=100, every=10`. |
| KQL          | ⚠️      | Use row numbering and manual bucketing.                                                                   |
| SPL          | ⚠️      | Use `streamstats window=...` for per-event results.                                                       |
| Cribl Stream | ⚠️      | Batch controls exist without a general count-window block.                                                |

### Per-input-event running and rolling stats

Per-input-event statistics update a calculation for each arriving event. This is different from periodic emission because the output cadence follows events, not a timer. Running statistics retain unbounded aggregate state, while rolling statistics expire events outside a trailing count or time horizon.

| System       | Support | Notes                                                                                                                                                                                                                                                           |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use cumulative event emission from [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) for unbounded state or `trailing=true` with a duration or count [`window`](https://tenzir.com/docs/reference/operators/window.md) for bounded state. |
| KQL          | ⚠️      | Use manual expansion or row-window functions.                                                                                                                                                                                                                   |
| SPL          | ✅       | Use `streamstats`; `window` and `time_window` add bounded history.                                                                                                                                                                                              |
| Cribl Stream | ❌       | Aggregations emit window events.                                                                                                                                                                                                                                |

For unbounded running aggregates, TQL’s cumulative event emission from [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) avoids replaying a trailing history. This is the direct counterpart to `streamstats` without either bound.

### Per-key event-time windows

Per-key event-time windows keep separate windowed results for each entity. Events from one noisy key cannot advance or close windows for another key.

| System       | Support | Notes                                                                                                                                           |
| ------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | Compose [`group`](https://tenzir.com/docs/reference/operators/group.md) with [`window`](https://tenzir.com/docs/reference/operators/window.md). |
| KQL          | ✅       | Use `summarize ... by key, bin(ts, ...)`.                                                                                                       |
| SPL          | ✅       | Use `BY key` or split-by.                                                                                                                       |
| Cribl Stream | ✅       | Use `Group by fields` with `Time window`.                                                                                                       |

### Streaming late-event tolerance

Streaming late-event tolerance lets a pipeline accept delayed data without holding every window until the input ends. Fixed windows stay open for the tolerance, while trailing windows buffer and reorder events within it before evaluation.

| System       | Support | Notes                                                                                  |
| ------------ | ------- | -------------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) `tolerance=...`. |
| KQL          | ❌       | Mostly batch or query-time semantics.                                                  |
| SPL          | ⚠️      | Depends on search order.                                                               |
| Cribl Stream | ✅       | Use Aggregations `Lag tolerance`.                                                      |

### Independent per-key event-time clocks

Independent per-key clocks let each group advance event time based only on its own events. This prevents a busy key from making sparse keys late, but sparse windows may also close later.

| System       | Support | Notes                                                                                                                                                  |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TQL          | ✅       | Put [`window`](https://tenzir.com/docs/reference/operators/window.md) inside an outer [`group`](https://tenzir.com/docs/reference/operators/group.md). |
| KQL          | ❌       | No streaming clock per key in ad hoc KQL.                                                                                                              |
| SPL          | ⚠️      | Requires search-order dependent workarounds.                                                                                                           |
| Cribl Stream | ⚠️      | Grouped buckets exist, but no documented per-key clock.                                                                                                |

### Arbitrary subpipeline per key

An arbitrary per-key subpipeline can do more than compute a fixed aggregate list. It can reshape, filter, enrich, or sink each group’s stream independently.

| System       | Support | Notes                                                                              |
| ------------ | ------- | ---------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`group`](https://tenzir.com/docs/reference/operators/group.md) `key { ... }`. |
| KQL          | ❌       | No direct equivalent.                                                              |
| SPL          | ❌       | No direct equivalent.                                                              |
| Cribl Stream | ❌       | No grouped Function block.                                                         |

### Arbitrary subpipeline per window

An arbitrary per-window subpipeline runs custom logic inside each time range, count range, or per-event trailing history. It covers detections that need more than a fixed aggregate list, such as post-aggregation filtering or alert formatting.

| System       | Support | Notes                                                                            |
| ------------ | ------- | -------------------------------------------------------------------------------- |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) `{ ... }`. |
| KQL          | ❌       | No direct equivalent.                                                            |
| SPL          | ❌       | No direct equivalent.                                                            |
| Cribl Stream | ❌       | Aggregations only emit configured outputs.                                       |

### Sink per key or per window

A sink per key or window sends results from inside the grouped or windowed scope. This supports local alerting or routing decisions without merging all results back into a shared stream first.

| System       | Support | Notes                                                                                                                                                          |
| ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TQL          | ✅       | [`group`](https://tenzir.com/docs/reference/operators/group.md) and [`window`](https://tenzir.com/docs/reference/operators/window.md) blocks can end in sinks. |
| KQL          | ❌       | No direct query-language equivalent.                                                                                                                           |
| SPL          | ❌       | No direct query-language equivalent.                                                                                                                           |
| Cribl Stream | ⚠️      | Route emitted aggregate events downstream.                                                                                                                     |

### Empty window padding

Empty window padding emits rows for time ranges that have no events. This is useful for charts and time-series joins that need an explicit zero or null for missing intervals.

| System       | Support | Notes                                   |
| ------------ | ------- | --------------------------------------- |
| TQL          | ❌       | Empty windows are not emitted.          |
| KQL          | ⚠️      | Use manual `range` and `union` padding. |
| SPL          | ✅       | Use `timechart cont=true`.              |
| Cribl Stream | ❌       | No documented empty buckets.            |

### Session windows

Session windows group events by gaps in activity rather than fixed boundaries. They are useful for user sessions, transactions, and bursts where the end time depends on silence.

| System       | Support | Notes                                                                                                                                                                                      |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TQL          | ✅       | Use [`window`](https://tenzir.com/docs/reference/operators/window.md) `gap=5min` and compose it with [`group`](https://tenzir.com/docs/reference/operators/group.md) for per-key sessions. |
| KQL          | ✅       | Use `row_window_session()`.                                                                                                                                                                |
| SPL          | ✅       | Use `transaction maxpause` and `maxspan`.                                                                                                                                                  |
| Cribl Stream | ❌       | Not native.                                                                                                                                                                                |

### Custom alignment or calendar windows

Custom alignment or calendar windows anchor boundaries to a chosen origin or calendar unit. This matters for reports that must align to local business days, weeks, months, or other non-epoch boundaries.

| System       | Support | Notes                                                                                                                                       |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TQL          | ⚠️      | Fixed [`window`](https://tenzir.com/docs/reference/operators/window.md) buckets are epoch-anchored; no custom origin or calendar alignment. |
| KQL          | ✅       | Use `bin_at()`.                                                                                                                             |
| SPL          | ✅       | Use `aligntime` and calendar spans.                                                                                                         |
| Cribl Stream | ⚠️      | Fixed `Time window` buckets; no documented custom origin or calendar alignment.                                                             |

Legend: ✅ native or covered, ⚠️ partial or workaround, ❌ missing.

Cribl Stream’s Aggregations Function runs independently per Worker Process, so aggregate state is not shared globally across workers. [Scheduled Collector jobs](https://docs.cribl.io/stream/collectors/) can run on a recurrence, but they schedule collection work rather than provide a general pipeline Function block.

## See also

* [`window`](https://tenzir.com/docs/reference/operators/window.md)
* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [Repair out-of-order events](../shape/repair-out-of-order-events.md)
* [Aggregate event streams](aggregate-event-streams.md)
* [Shape aggregation results](shape-aggregation-results.md)
* [Detect over time windows](../detect/detect-over-time-windows.md)
