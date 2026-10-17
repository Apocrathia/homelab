---
title: "window"
canonical: https://tenzir.com/docs/reference/operators/window
source: https://tenzir.com/docs/reference/operators/window.md
section: "Docs"
---

# window

> Runs a subpipeline over time-based or count-based windows.

Runs a subpipeline over time-based or count-based windows.

```tql
window [size=duration|int],
       [gap=duration],
       [every=duration|int],
       [trailing=bool],
       [on=expression],
       [trigger=expression],
       [tolerance=duration],
       [idle_timeout=duration] {
  …
}
```

Specify at least one of `size` or `gap`. With `gap`, `size` is an optional duration or event-count cap for the session.

## Description

The `window` operator assigns events to subpipelines. The types of `size` and `every` select the window basis, while `trailing=true` selects windows anchored to input events:

| `size`   | `every`  | `trailing` | Window type                     |
| -------- | -------- | ---------- | ------------------------------- |
| Duration | Omitted  | `false`    | Tumbling time windows           |
| Duration | Duration | `false`    | Hopping time windows            |
| Duration | Omitted  | `true`     | Trailing time window per event  |
| Duration | Duration | `true`     | Sampled trailing time windows   |
| Integer  | Omitted  | `false`    | Tumbling count windows          |
| Integer  | Integer  | `false`    | Hopping count windows           |
| Integer  | Omitted  | `true`     | Trailing count window per event |
| Integer  | Integer  | `true`     | Sampled trailing count windows  |

Tumbling and hopping windows are **fixed windows**. Their boundaries align to the Unix epoch for time windows and offset zero for count windows. A tumbling window starts every `size`; a hopping window starts every `every`. When `every < size`, fixed windows overlap and one event can enter multiple subpipelines.

A **trailing window** is anchored to the event that fires it and closes immediately after its subpipeline runs. It includes the triggering event and the bounded history that precedes it. By default, every input event produces an invocation. Set `every` to sample the history at a count or duration cadence, and set `trigger` to restrict which events can fire the subpipeline. All events still enter the retained history and advance the cadence.

A **session window** uses `gap`. The first event starts a session. With event time, each later event joins while its distance from the previous event is at most `gap`. A greater distance closes the current session and starts another one. With processing time, arrivals up to and including the wall-clock gap deadline join the session, while a later arrival starts a new one. Omit `size` for an unbounded session, or set it to a duration or integer to cap the session by total duration or event count.

Events stream directly into fixed and session subpipelines. A session keeps one subpipeline alive until inactivity or an explicit bound closes it. A session subpipeline that stops early, such as one starting with `head`, consumes the remaining events delivered with it; the next event then starts a new session even within the gap. Trailing windows retain and replay their bounded history for each invocation. A subpipeline can emit events, which become the operator output, or end with a sink, which makes `window` a sink. It must not produce bytes. The operator doesn’t emit empty windows. Outputs from trailing and session subpipelines preserve window creation order: `window` emits all output from one invocation before output from the next. Outputs from concurrent fixed-window subpipelines can interleave.

### Time clocks

A duration `size` or `gap` uses one of two clocks:

* Specify `on` to use **event time**. The expression supplies each event’s timestamp, and the largest observed timestamp advances the clock.
* Omit `on` to use **processing time**. The event’s wall-clock arrival time determines its window.

Fixed event-time windows close when the event-time clock reaches the window end plus `tolerance`. The newest window can therefore remain open until a later event arrives, `idle_timeout` expires, or the input ends. Late events whose windows have already closed are dropped with a warning.

Fixed processing-time windows close at their wall-clock boundary, even when no later event arrives. Their boundaries are epoch-aligned, not relative to the pipeline start time. Restored windows whose end has passed close immediately.

Trailing and session event-time windows reorder events within `tolerance` before evaluating their subpipelines. Events that arrive more than `tolerance` behind the largest observed timestamp are dropped with the same late-event warning as fixed windows. The default tolerance of `0s` requires nondecreasing timestamps. Duplicate timestamps are accepted and remain in arrival order. Trailing and session processing-time windows follow arrival order.

An event-time session closes when its local watermark passes the last event’s timestamp plus `gap`. A processing-time session closes on a wall-clock timer, so it doesn’t need a later event to detect inactivity. Checkpointing closes an open session, so a pipeline restored from a checkpoint starts sessions fresh.

Fixed windows delay closure but still forward events to their subpipelines in arrival order. Place [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md) before a fixed window when its subpipeline requires timestamp order. A trailing event-time window already performs this reordering, so a preceding `reorder` is usually redundant.

### Count offsets

A count window assigns the first event offset `0`, the next event offset `1`, and so on. Fixed count windows use half-open offset ranges. For example, `size=100` creates `[0, 100)`, `[100, 200)`, and later ranges. The operator closes a window when it reaches the exclusive finish offset, independent of how events are divided into batches.

Count windows follow arrival order. They don’t accept `on`, `tolerance`, or `idle_timeout`.

### Keyed windows

`window` has no built-in partition key. For fixed-window aggregations, put [`group`](https://tenzir.com/docs/reference/operators/group.md) inside `window` by default. The stream then has one clock, and closing a window also closes every group subpipeline inside it. This bounds high-cardinality state without waiting for another event from each key.

Put `group` outside `window` when each key requires independent fixed-window clocks, trailing history, or sessions. A busy key then cannot advance another key’s event-time clock or enter its retained history. Session windows usually use this form because inactivity applies independently to each key:

```tql
group host {
  window gap=5min, on=time {
    summarize events=count()
    host = $group
  }
}
```

Use independent per-key clocks deliberately

An outer `group` also gives sparse keys independent lifetimes. A sparse event-time fixed or session window can remain open until that key receives another event, its `idle_timeout` expires, or the input ends.

### Trailing-window cost

A generic trailing window replays every retained event through a new subpipeline for every invocation. Without `every` or `trigger`, its work is approximately the number of input events multiplied by the average retained event count. Large or dense time windows can therefore consume substantial CPU and memory. For event-time windows, the reorder buffer can retain up to `tolerance` worth of events in addition to the trailing `size`. Tenzir warns when a trailing window retains 100,000 events and never drops retained events to enforce a hidden limit.

Use [`lag`](https://tenzir.com/docs/reference/operators/lag.md) instead when you need only one preceding value or complete event at a fixed offset. It evaluates and retains that value incrementally instead of replaying a bounded history through a new subpipeline for every input event.

Set `every` to sample retained history at a lower cadence. Set `trigger` when only some events warrant evaluation. The operator always maintains the retained history, but it replays the history only when the cadence is due and the trigger matches.

A [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) without `options` emits one final summary for each replayed window. Its `options.emit` cadence is independent: it starts fresh with each window invocation and can emit multiple prefix summaries while consuming the replayed history. Leave `options.emit` unset when you want one rolling result per outer `window` cadence.

For basic unbounded running aggregates, use [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) with cumulative event emission instead. It updates aggregate state incrementally and corresponds to Splunk `streamstats` without `window` or `time_window`:

```tql
summarize rolling_bytes=sum(bytes), host,
  options={mode: "cumulative"}
```

Use a trailing `window` when you need bounded `streamstats` semantics or an arbitrary subpipeline:

| Splunk SPL                                      | TQL                                                           |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `streamstats sum(bytes) BY host`                | Cumulative event emission from `summarize`                    |
| `streamstats window=100 sum(bytes) BY host`     | `group host { window size=100, trailing=true { … } }`         |
| `streamstats time_window=5m sum(bytes) BY host` | `group host { window size=5min, trailing=true, on=ts { … } }` |

### Session-window cost

A session streams every admitted event into one long-lived subpipeline. It doesn’t retain and replay the complete session. The subpipeline’s own state can still grow without a bound, and an event-time reorder buffer retains up to `tolerance` worth of input. Tenzir warns when this reorder buffer reaches 100,000 events, but it doesn’t discard events or impose a hidden limit.

Set a duration or integer `size` when an operational limit should split a busy session.

## Parameters

### `size = duration|int` (optional)

The positive duration or event count that defines the window width when you omit `gap`. For a session selected by `gap`, a duration caps its total duration and an integer caps its event count. Omit `size` to leave a session without an explicit total bound.

### `gap = duration`

The positive maximum distance between consecutive events in a session. In an event-time session, an event at exactly the gap boundary remains in the session, while a greater distance starts a new one. A processing-time session applies the same boundary: an arrival exactly at the wall-clock gap deadline joins the session, while a later arrival starts a new one. Without arrivals, a timer closes the session once the deadline passes.

A session can remain open indefinitely while events continue within the gap. Set `size` when you need a duration or event-count cap. Session windows reject `every`, `trailing`, and `trigger`.

### `every = duration|int` (optional)

The positive distance between window invocations. It must have the same type as `size`.

For fixed windows, `every` determines the distance between aligned window starts and must not exceed `size`. Omit it for tumbling windows.

For trailing windows, `every` defines a minimum count or duration cadence and can exceed `size`. A count cadence becomes due after that many input events. A duration cadence starts with the first input event and becomes due once the selected clock advances by that duration. The next event that satisfies `trigger` fires the window and starts a new cadence. `window` doesn’t fire a final partial cadence when the input ends.

Omit `every` to let every event that satisfies `trigger` fire a trailing window.

### `trailing = bool` (optional)

Set to `true` to anchor windows to input events instead of fixed boundaries. This works with duration and count windows and can be combined with `every`. It defaults to `false`.

### `on = expression` (optional)

The event-time expression for duration windows and sessions. It must evaluate to a timestamp. Events for which it evaluates to null or another type are dropped with a warning.

Omit `on` to use processing time. Count windows reject `on`, but a session can combine `on` with an integer `size` because the integer caps only its event count.

### `trigger = expression` (optional)

A boolean expression that selects which events can fire a trailing window. Every event enters the retained history, advances the clock and cadence, and counts toward the offsets, but only events for which `trigger` evaluates to `true` run the subpipeline. When an `every` cadence is due, it remains due until a matching event arrives. Events for which it evaluates to null or another type never fire, and the operator warns about them.

Use `trigger` when only some events warrant evaluating the window, such as a successful login after repeated failures. It avoids replaying the retained history for events that cannot produce a result.

Omit `trigger` to fire on every event. Fixed windows reject `trigger` because their boundaries, not events, drive evaluation.

### `tolerance = duration` (optional)

The nonnegative amount of out-of-order event time to accept. It defaults to `0s`.

For fixed event-time windows, `tolerance` delays closing until the event-time clock reaches the window end plus the tolerance. For trailing event-time windows, it holds events in a reorder buffer until the observed watermark reaches their timestamp plus the tolerance. Events that arrive later are dropped with a warning.

Only duration and session windows with `on` accept `tolerance`.

### `idle_timeout = duration` (optional)

The positive wall-clock time that a fixed or session event-time window can remain open without receiving an event. The timeout force-closes the window. A session flushes its reorder buffer before it closes. A later accepted event starts a new session.

Only fixed duration and session windows with `on` accept `idle_timeout`. Processing-time windows already close at their wall-clock boundary.

### `{ … }`

The subpipeline for each window. Inside it, `$window` contains the metadata that applies to the selected window:

| Field            | Type   | Description                                 |
| ---------------- | ------ | ------------------------------------------- |
| `$window.start`  | time   | The time-window or session start.           |
| `$window.end`    | time   | The fixed or trailing time-window end.      |
| `$window.begin`  | uint   | The inclusive count-window start offset.    |
| `$window.finish` | uint   | The exclusive count-window finish offset.   |
| `$window.event`  | record | The event that triggered a trailing window. |

Fixed time intervals are left-closed and right-open: `[start, end)`. Trailing time intervals include both boundaries: `[start, end]`. A session window exposes its known start through `$window.start`. Only fields that apply to the selected basis and shape are present.

The operator doesn’t add metadata to output events automatically. Assign it inside the subpipeline when you need it.

## Examples

### Count security events per hour

Count events by severity in epoch-aligned, one-hour event-time windows:

```tql
from_kafka "security-events"
this = message.parse_json()
ts = ts.time()
window size=1h, on=ts, tolerance=5min {
  summarize severity, events=count()
  start = $window.start
  end = $window.end
}
```

Omit `on` to assign arriving events to processing-time windows that close on the wall clock:

```tql
window size=5s {
  summarize events=count()
}
```

### Group activity into sessions

Count each host’s activity burst after more than five minutes of event-time inactivity. The session can last longer than five minutes as long as every consecutive gap stays within the bound:

```tql
group host {
  window gap=5min, size=24h, on=time, tolerance=30s {
    summarize events=count(), commands=distinct(process.name)
    host = $group
    where events >= 5
    session_start = $window.start
  }
}
```

This duration `size` caps the session at 24 hours. Use `size=1000` instead to cap it at 1,000 events. Omit `size` for no total bound, and omit `on` to use processing time. A processing-time session closes five minutes after the most recent arrival, even when no later event arrives.

### Process count-based batches

Run one subpipeline for each 100-event batch. When finite input ends, the subpipeline processes the final partial batch:

```tql
window size=100 {
  summarize events=count()
  begin = $window.begin
  finish = $window.finish
}
```

Use `every=10` to start a 100-event window every 10 events.

### Add a rolling time total to every event

The trailing interval for an event at `ts` contains events from `ts - 5min` through `ts`, including both endpoints. The outer group keeps independent host histories. A 30-second tolerance reorders slightly late events before evaluating the trailing windows:

```tql
group host {
  window size=5min, trailing=true, on=ts, tolerance=30s {
    summarize rolling_bytes=sum(bytes), events=count()
    this = {
      ...$window.event,
      rolling_bytes: rolling_bytes,
      events: events,
    }
  }
}
```

The equivalent count-based form keeps the current event and up to 99 preceding events:

```tql
window size=100, trailing=true {
  summarize rolling_mean=mean(latency)
  this = {...$window.event, rolling_mean: rolling_mean}
}
```

### Sample an expensive rolling aggregate

Recompute a percentile over the most recent 10,000 events after every 100 input events. The inner `summarize` omits `options.emit`, so it produces one result per window invocation:

```tql
window size=10_000, every=100, trailing=true {
  summarize p99=quantile(latency, 0.99)
  this = {...$window.event, p99: p99}
}
```

Use a duration `size` and `every` for rolling dashboard snapshots such as the last hour evaluated every minute.

### Detect a successful login after repeated failures

A trigger fires the trailing window only for successful logins. The preceding failures stay in the retained history and become the evidence attached to the triggering event:

```tql
where class_uid == 3002 and activity_id == 1
group user.name {
  window size=10min, trailing=true, on=time, trigger=status_id == 1 {
    summarize failures=count_if(status_id, x => x == 2)
    where failures >= 5
    this = {
      ...$window.event,
      prior_failures: failures,
      evidence_start: $window.start,
      evidence_end: $window.end,
    }
  }
}
```

### Detect brute-force logins with a hopping window

Use a fixed event-time window to evaluate grouped detections over aligned intervals instead of enriching every event. Each interval can produce one alert per qualifying group:

```tql
where action == "login" and outcome == "failure"
window size=10min, every=1min, on=ts, tolerance=2min, idle_timeout=5min {
  group {user: user, src_ip: src_ip} {
    summarize failures=count(), target_hosts=distinct(host)
    user = $group.user
    src_ip = $group.src_ip
    start = $window.start
    end = $window.end
  }
}
where failures >= 20
```

## See Also

* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`every`](https://tenzir.com/docs/reference/operators/every.md)
* [Window event streams](../../guides/analyze/window-event-streams.md)
* [Detect over time windows](../../guides/detect/detect-over-time-windows.md)
* [Repair out-of-order events](../../guides/shape/repair-out-of-order-events.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)
