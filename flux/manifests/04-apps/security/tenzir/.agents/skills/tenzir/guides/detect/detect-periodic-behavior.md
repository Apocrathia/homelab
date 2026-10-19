---
title: "Detect periodic behavior"
description: "Score beaconing cadence with robust statistics, recover periods with autocorrelation, and catch implants that hold one connection open"
canonical: https://tenzir.com/docs/guides/detect/detect-periodic-behavior
source: https://tenzir.com/docs/guides/detect/detect-periodic-behavior.md
section: "Docs"
---

# Detect periodic behavior

> Score beaconing cadence with robust statistics, recover periods with autocorrelation, and catch implants that hold one connection open

This guide shows you how to detect periodic behavior, such as a command-and-control implant that checks in on a timer. The signal lives in the timestamps, so these detections need no payload inspection or decryption. [RITA](https://github.com/activecm/rita) popularized this analysis for Zeek connection logs; the same statistics run here as streaming pipelines over any source with an OCSF Network Activity mapping.

Where the guide on [detecting over time windows](detect-over-time-windows.md) counts how much happened, this one measures how regularly it happened. Start with [robust estimators](https://en.wikipedia.org/wiki/Robust_statistics), which resist outliers, then recover periods with [autocorrelation](https://en.wikipedia.org/wiki/Autocorrelation), which compares a sequence with shifted copies of itself. Finish with the connections that never repeat.

## Choose estimators that survive outliers

Implants miss check-ins, and one long gap creates an outlier in the interval distribution. The mean and standard deviation are sensitive to such values, whereas the median and [median absolute deviation (MAD)](https://en.wikipedia.org/wiki/Median_absolute_deviation) are robust. MAD is the median of the absolute distances from the sample median. Compute inter-arrival intervals with [`deltas`](https://tenzir.com/docs/reference/functions/deltas.md), then compare the four estimators on a steady 60-second cadence with one 10-minute gap:

```tql
from {
  times: [
    2024-01-01T10:00:00,
    2024-01-01T10:01:00,
    2024-01-01T10:01:59,
    2024-01-01T10:03:00,
    2024-01-01T10:13:00,
    2024-01-01T10:14:00,
    2024-01-01T10:14:59,
    2024-01-01T10:16:00,
  ],
}
intervals = times.deltas()
mean_interval = intervals.mean()
stddev_interval = intervals.stddev()
median_interval = intervals.median()
mad_interval = intervals.mad()
drop times, intervals
```

```tql
{
  mean_interval: 2.2857142857min,
  stddev_interval: 3.1493691554166667min,
  median_interval: 1min,
  mad_interval: 1s,
}
```

The gap more than doubles the mean and pushes the standard deviation past three minutes, while the median and [`mad`](https://tenzir.com/docs/reference/functions/mad.md) stay at one minute and one second. Prefer median and MAD when missed check-ins can introduce outliers.

[`deltas`](https://tenzir.com/docs/reference/functions/deltas.md) returns durations for timestamp input, so thresholds read as `10s` or `3min` rather than bare numbers.

## Score a beacon candidate

Collect timestamps and flow byte counts per connection tuple inside a fixed event-time window, then filter on both distributions. [Statistical dispersion](https://en.wikipedia.org/wiki/Statistical_dispersion) describes how widely values vary around a typical value. This pipeline limits relative dispersion by requiring MAD to stay within a fraction of the median. The sample records show only the OCSF fields the detection uses:

```tql
let $min_samples = 8
let $min_period = 10s
let $max_period = 3min
let $max_interval_dispersion = 0.2
let $max_size = 4096
let $max_size_dispersion = 0.35
let $max_skew = 0.6


from {time: 2024-01-01T10:00:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 512}},
     {time: 2024-01-01T10:01:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 498}},
     {time: 2024-01-01T10:01:59, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 505}},
     {time: 2024-01-01T10:03:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 510}},
     {time: 2024-01-01T10:13:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 502}},
     {time: 2024-01-01T10:14:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 508}},
     {time: 2024-01-01T10:14:59, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 495}},
     {time: 2024-01-01T10:16:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 443}, traffic: {bytes_out: 515}}
// class_name: "Network Activity", activity_name: "Traffic"
where class_uid == 4001 and activity_id == 6
window size=30min, on=time, tolerance=1min, idle_timeout=5min {
  group {
    src_ip: src_endpoint.ip,
    dst_ip: dst_endpoint.ip,
    dst_port: dst_endpoint.port,
  } {
    sort time
    summarize times=collect(time),
              sizes=collect(traffic.bytes_out),
              samples=count()
    intervals = times.deltas()
    interval_median = intervals.median()
    interval_mad = intervals.mad()
    interval_skew = intervals.skewness(method="bowley")
    size_median = sizes.median()
    size_mad = sizes.mad()
    size_skew = sizes.skewness(method="bowley")
    src_ip = $group.src_ip
    dst_ip = $group.dst_ip
    dst_port = $group.dst_port
    start = $window.start
    end = $window.end
    drop times, sizes, intervals
  }
}
where samples >= $min_samples and
      interval_median >= $min_period and interval_median <= $max_period and
      interval_mad <= interval_median * $max_interval_dispersion and
      abs(interval_skew) <= $max_skew and
      size_median <= $max_size and
      size_mad <= size_median * $max_size_dispersion and
      abs(size_skew) <= $max_skew
select src_ip, dst_ip, dst_port, samples, interval_median, interval_mad,
       interval_skew, size_median, size_mad, size_skew, start, end
```

```tql
{
  src_ip: 10.0.0.9,
  dst_ip: 203.0.113.5,
  dst_port: 443,
  samples: 8,
  interval_median: 1min,
  interval_mad: 1s,
  interval_skew: 0.3333333333333333,
  size_median: 506.5,
  size_mad: 5.0,
  size_skew: -0.15789473684210525,
  start: 2024-01-01T10:00:00Z,
  end: 2024-01-01T10:30:00Z,
}
```

Keep [`sort`](https://tenzir.com/docs/reference/operators/sort.md) inside the window so it buffers one tuple and period rather than an unbounded stream. The MAD bound relative to the median sets the jitter tolerance: at `0.2`, a beacon randomizing its sleep by plus or minus 20 percent still passes.

The fixed window bounds which cadences you can observe and runs one window invocation per aligned interval, in which each qualifying connection tuple can yield a candidate. Eight samples in 30 minutes caps the detectable period near three minutes, so an implant sleeping for an hour needs hourly or daily windows, or a scheduled query over stored events, as the guide on [baselining behavior from stored events](baseline-from-stored-events.md) develops.

Update checks, monitoring agents, and health probes are periodic by design. Filter them out with destination reputation, first-seen time, or asset role before routing results as alerts.

### Filter by symmetry

A dispersion bound limits spread but not asymmetry. [Skewness](https://en.wikipedia.org/wiki/Skewness) measures that asymmetry, so the candidate pipeline computes [`skewness`](https://tenzir.com/docs/reference/functions/skewness.md) for both intervals and flow byte counts and filters on their absolute values.

Use `method="bowley"` when long gaps are expected. Default moment skewness uses cubed deviations from the mean, while Bowley skewness uses [quartiles](https://en.wikipedia.org/wiki/Quartile) and is less sensitive to outliers. On this example data, moment skewness is `2.04`, while Bowley skewness is `0.33` and remains inside the `0.6` bound. On small samples, quartiles move in steps, so use skewness as a coarse filter rather than a precise score.

## Recover the period directly

Interval statistics assume the tuple carries one repeating conversation. When a browser and an implant talk to the same destination, the events interleave and the intervals describe neither. Recover the period from the [frequency domain](https://en.wikipedia.org/wiki/Frequency_domain), which represents a signal by repetition rate rather than event-to-event timing. [`dominant_period`](https://tenzir.com/docs/reference/functions/dominant_period.md) bins timestamps at a chosen resolution, autocorrelates the count series, and returns the strongest lag, the offset between the series and its shifted copy, with a strength between 0 and 1:

```tql
from {time: 2024-01-01T10:00:00},
     {time: 2024-01-01T10:01:00},
     {time: 2024-01-01T10:02:00},
     {time: 2024-01-01T10:03:00},
     {time: 2024-01-01T10:05:00},
     {time: 2024-01-01T10:06:00},
     {time: 2024-01-01T10:07:00},
     {time: 2024-01-01T10:08:00},
     {time: 2024-01-01T10:09:00},
     {time: 2024-01-01T10:10:00}
summarize times=collect(time)
beat = times.dominant_period(resolution=10s)
drop times
```

```tql
{
  beat: {
    period: 1min,
    strength: 0.7807135969141755,
  },
}
```

The series skips a check-in at `10:04` and still yields the one-minute period. This approach is especially useful when unrelated traffic interleaves with the periodic events and the inter-arrival intervals no longer describe one cadence.

Apply the same calculation per connection tuple inside a fixed hopping window. The window starts a new subpipeline at five-minute event-time hops rather than once for every input event:

detect-dominant-period.tql

```tql
let $min_samples = 8
let $min_strength = 0.5


subscribe "ocsf"
where class_uid == 4001 and activity_id == 6
window size=30min, every=5min, on=time,
       tolerance=1min, idle_timeout=5min {
  group {
    src_ip: src_endpoint.ip,
    dst_ip: dst_endpoint.ip,
    dst_port: dst_endpoint.port,
  } {
    summarize times=collect(time), samples=count()
    where samples >= $min_samples
    beat = times.dominant_period(resolution=10s)
    src_ip = $group.src_ip
    dst_ip = $group.dst_ip
    dst_port = $group.dst_port
    start = $window.start
    end = $window.end
    drop times
  }
}
where beat.strength >= $min_strength
select src_ip, dst_ip, dst_port, samples, beat, start, end
```

Size the resolution against the jitter

Too fine a `resolution` smears a jittered beacon across neighboring bins, too coarse a one collapses distinct periods into one. A clean 60-second beacon recovers `1min` at strength above `0.87` for every resolution from `5s` to `30s`. Add plus or minus two seconds of jitter and competing traffic on the same tuple, and only `15s` recovers it, at strength `0.38`. Sweep the resolution against representative traffic, and compare strengths against each other rather than against a fixed number.

For full control, [`autocorrelation`](https://tenzir.com/docs/reference/functions/autocorrelation.md) returns the coefficients themselves, one per lag:

```tql
from {
  counts: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
}
select r = counts.autocorrelation(max_lag=4)
```

```tql
{
  r: [
    1.0,
    -0.9166666666666666,
    0.8333333333333334,
    -0.75,
    0.6666666666666666,
  ],
}
```

Lag 0 is always 1, and a peak at lag `k` means the series repeats every `k` samples, here every 2. A [periodogram](https://en.wikipedia.org/wiki/Periodogram) estimates signal power at each frequency; use [`periodogram`](https://tenzir.com/docs/reference/functions/periodogram.md) when you want that view instead of correlation per lag.

## Catch implants that never beacon

An implant that holds one connection open and multiplexes its tasking inside produces no repeated events, so neither interval statistics nor autocorrelation see it. Exporters slice such a connection into consecutive records, so sum `traffic.timespan.duration` per tuple to recover how long it stayed open. OCSF stores that duration as an integer number of milliseconds:

```tql
let $min_observed = 45min


from {time: 2024-01-01T10:00:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 8443}, traffic: {timespan: {duration: 900000}}},
     {time: 2024-01-01T10:15:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 8443}, traffic: {timespan: {duration: 900000}}},
     {time: 2024-01-01T10:30:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 8443}, traffic: {timespan: {duration: 900000}}},
     {time: 2024-01-01T10:45:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 203.0.113.5, port: 8443}, traffic: {timespan: {duration: 900000}}},
     {time: 2024-01-01T10:20:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.4}, dst_endpoint: {ip: 198.51.100.7, port: 443}, traffic: {timespan: {duration: 2000}}}
where class_uid == 4001 and activity_id == 6
window size=1h, on=time, tolerance=1min, idle_timeout=15min {
  group {
    src_ip: src_endpoint.ip,
    dst_ip: dst_endpoint.ip,
    dst_port: dst_endpoint.port,
  } {
    summarize observed_ms=sum(traffic.timespan.duration), flows=count()
    src_ip = $group.src_ip
    dst_ip = $group.dst_ip
    dst_port = $group.dst_port
  }
}
where observed_ms >= count_milliseconds($min_observed)
select src_ip, dst_ip, dst_port, observed_ms, flows
```

```tql
{
  src_ip: 10.0.0.9,
  dst_ip: 203.0.113.5,
  dst_port: 8443,
  observed_ms: 3600000,
  flows: 4,
}
```

Run this alongside beacon scoring to cover both behaviors.

## Turn candidates into findings

Append the following transformation to the beacon candidate pipeline to emit an OCSF [Detection Finding](https://schema.ocsf.io/classes/detection_finding). Its `time` records finding creation, while `start_time` and `end_time` preserve the evidence window:

```tql
this = {
  time: now(),
  metadata: {
    product: {name: "Tenzir", vendor_name: "Tenzir"},
    uid: f"finding-create-beacon-{src_ip}-{dst_ip}-{dst_port}-{start}",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 3,
  status_id: 1,
  is_alert: true,
  start_time: start,
  end_time: end,
  finding_info: {
    uid: f"beacon-{src_ip}-{dst_ip}-{dst_port}-{start}",
    title: f"Periodic network activity from {src_ip} to {dst_ip}:{dst_port}",
    analytic: {
      name: "Periodic network activity",
      uid: "periodic_network_activity",
      type_id: 3,
    },
  },
  unmapped: {
    src_ip: src_ip,
    dst_ip: dst_ip,
    dst_port: dst_port,
    samples: samples,
    interval_median: interval_median,
    interval_mad: interval_mad,
    interval_skew: interval_skew,
    size_median: size_median,
    size_mad: size_mad,
    size_skew: size_skew,
  },
}
type_uid = class_uid * 100 + activity_id
```

When you use the `dominant_period` variant, put `beat.period` and `beat.strength` in `unmapped` instead. The guide on [modeling detections in OCSF](model-detections-in-ocsf.md#create-a-detection-finding) covers identities, evidence, and lifecycle fields in detail. A [multi-stage detector](create-multi-stage-detectors.md) can then combine a beacon candidate with another finding before escalating.

## See Also

* [Detections](../../explanations/detections.md)
* [`window`](https://tenzir.com/docs/reference/operators/window.md)
* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`sort`](https://tenzir.com/docs/reference/operators/sort.md)
* [`deltas`](https://tenzir.com/docs/reference/functions/deltas.md)
* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [`skewness`](https://tenzir.com/docs/reference/functions/skewness.md)
* [`dominant_period`](https://tenzir.com/docs/reference/functions/dominant_period.md)
* [`autocorrelation`](https://tenzir.com/docs/reference/functions/autocorrelation.md)
* [`periodogram`](https://tenzir.com/docs/reference/functions/periodogram.md)
* [Detect over time windows](detect-over-time-windows.md)
* [Model detections in OCSF](model-detections-in-ocsf.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
