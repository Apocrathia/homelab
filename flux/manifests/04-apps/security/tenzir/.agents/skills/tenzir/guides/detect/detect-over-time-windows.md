---
title: "Detect over time windows"
description: "Build streaming detections with event-time windows, from failure thresholds to statistical baselines, with duplicate suppression"
canonical: https://tenzir.com/docs/guides/detect/detect-over-time-windows
source: https://tenzir.com/docs/guides/detect/detect-over-time-windows.md
section: "Docs"
---

# Detect over time windows

> Build streaming detections with event-time windows, from failure thresholds to statistical baselines, with duplicate suppression

This guide shows you how to build detections that need more than one event: failure thresholds, traffic spikes, and behavioral baselines. The building blocks are [`window`](https://tenzir.com/docs/reference/operators/window.md) for bounded event-time state and [`group`](https://tenzir.com/docs/reference/operators/group.md) for per-entity isolation, with [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) computing the statistics inside each window.

Start with the time semantics, then build a threshold detector over tumbling windows. From there, develop the general pattern for a rolling-baseline detector through duplicate suppression and OCSF finding output, and close with compact network detectors for scanning and exfiltration. The guide on [aggregating event streams](../analyze/aggregate-event-streams.md) covers the general aggregation vocabulary behind these examples.

## Build detections on event time

Streaming detections answer questions about when things happened, not when events arrived. Three mechanisms look similar but behave differently:

* [`window`](https://tenzir.com/docs/reference/operators/window.md) with `on=time` uses **event time**. Fixed windows assign events to aligned intervals and keep them open for `tolerance`, but their subpipelines receive events in arrival order. Trailing windows reorder events within `tolerance` before evaluating event-anchored history. Use event-time windows for detections where a delayed event can change the answer.
* [`window`](https://tenzir.com/docs/reference/operators/window.md) without `on` assigns events by **processing time** and closes at epoch-aligned wall-clock boundaries. This is useful when arrival time is the intended detection clock.
* [`every`](https://tenzir.com/docs/reference/operators/every.md) reruns a block on a wall-clock schedule whose boundaries depend on pipeline start time. Use it for snapshots and polling, as shown in the [periodic snapshot pattern](../analyze/shape-aggregation-results.md#aggregate-periodic-snapshots).
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) with `options={emit: 5min, mode: "reset"}` emits aggregate updates on a processing-time cadence, but it doesn’t create event-time evidence intervals.

Order-independent fixed-window calculations such as counts and sums need no separate ordering step. Put [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md) before a fixed window when its subpipeline compares consecutive events or collects an activity sequence. Do not add it before a trailing event-time window for the same timestamp and tolerance because that window already performs the reorder. See the guide on [repairing out-of-order events](../shape/repair-out-of-order-events.md) for the complete ordering decision.

The examples in this guide use aligned tumbling or hopping windows, which run one subpipeline per fixed interval. By default, a trailing window with `trailing=true` instead runs once per input event and can enrich the triggering event through `$window.event`. That maps to bounded Splunk `streamstats`, but generic trailing windows replay their retained history for every invocation. Set `every` to sample that history at a lower count or duration cadence. Set `trigger` to fire only for events that can produce a result, such as a successful login after repeated failures. Add `tolerance` when trailing input can arrive out of order. Tenzir reorders events within the tolerance before evaluating their event-anchored history and warns about later events. Prefer aligned windows for periodic detection decisions unless you specifically need event-anchored results.

Size `tolerance` against the real skew in your telemetry: compare `time` (when the event occurred) with `metadata.logged_time` and `metadata.processed_time` (when it was recorded and processed) to see how late your events actually arrive, and give the window at least that much slack. For trailing windows, account for the additional memory: the reorder buffer can retain up to `tolerance` worth of events in addition to the trailing `size`.

## Count events in tumbling windows

A threshold detector counts matching events within each interval and emits a result when that count crosses a limit. The following example uses OCSF Authentication events: it groups failed logons by user and source IP address, counts failures in 10-minute event-time windows, and emits a threshold result when a pair exceeds the limit. The sample records show only the OCSF fields used by the detection:

```tql
from {time: 2024-01-01T10:00:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "alice"}, src_endpoint: {ip: 10.0.0.5}, dst_endpoint: {hostname: "vpn-1"}},
     {time: 2024-01-01T10:01:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "alice"}, src_endpoint: {ip: 10.0.0.5}, dst_endpoint: {hostname: "vpn-2"}},
     {time: 2024-01-01T10:02:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "alice"}, src_endpoint: {ip: 10.0.0.5}, dst_endpoint: {hostname: "vpn-1"}},
     {time: 2024-01-01T10:03:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "alice"}, src_endpoint: {ip: 10.0.0.5}, dst_endpoint: {hostname: "vpn-2"}},
     {time: 2024-01-01T10:04:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "alice"}, src_endpoint: {ip: 10.0.0.5}, dst_endpoint: {hostname: "vpn-3"}},
     {time: 2024-01-01T10:05:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "alice"}, src_endpoint: {ip: 10.0.0.5}, dst_endpoint: {hostname: "vpn-3"}},
     {time: 2024-01-01T10:06:00, class_uid: 3002, activity_id: 1, status_id: 2, user: {name: "bob"}, src_endpoint: {ip: 10.0.0.8}, dst_endpoint: {hostname: "vpn-1"}}
// class_name: "Authentication", activity_name: "Logon", status: "Failure"
where class_uid == 3002 and activity_id == 1 and status_id == 2
window size=10min, on=time, tolerance=30s, idle_timeout=5min {
  group {user: user.name, src_ip: src_endpoint.ip} {
    summarize failures=count(), target_hosts=count_distinct(dst_endpoint.hostname)
    user = $group.user
    src_ip = $group.src_ip
    start = $window.start
    end = $window.end
  }
}
where failures >= 5
select user, src_ip, failures, target_hosts, start, end
```

```tql
{
  user: "alice",
  src_ip: 10.0.0.5,
  failures: 6,
  target_hosts: 3,
  start: 2024-01-01T10:00:00Z,
  end: 2024-01-01T10:10:00Z,
}
```

In OCSF Authentication events, `activity_id: 1` means logon and `status_id: 2` means failure. The outer [`window`](https://tenzir.com/docs/reference/operators/window.md) gives the stream one event-time clock. When a window closes, every per-user group inside it closes too, so high-cardinality group state expires without waiting for another event from each key. The `idle_timeout` also closes the current stream-wide window after wall-clock inactivity.

Use independent per-key clocks deliberately

Put [`group`](https://tenzir.com/docs/reference/operators/group.md) outside [`window`](https://tenzir.com/docs/reference/operators/window.md) only when each key needs an independent event-time clock. That arrangement protects a sparse key from a busier key advancing the clock, but it also lets sparse groups retain state until their own next event, `idle_timeout`, or the end of the input.

This example uses tumbling windows because [`window`](https://tenzir.com/docs/reference/operators/window.md) omits `every`. With `size=10min`, the stream-wide intervals are `[10:00, 10:10)`, `[10:10, 10:20)`, and so on. An event exactly at `10:10` belongs to the second window because window ends are exclusive.

When your producers populate stable entity identifiers, group by those instead of display values: `user.uid` survives renames and `device.uid` survives DHCP churn, where `user.name` and hostnames do not.

The same window pattern implements Sigma’s [`event_count` and `value_count` correlations](https://github.com/SigmaHQ/sigma-specification/blob/main/specification/sigma-correlation-rules-specification.md).

## Detect geographically impossible logins

A trailing window can compare each authentication event with recent logins for the same user. Combine it with [`geo_distance`](https://tenzir.com/docs/reference/functions/geo_distance.md) to flag an account that appears more than 1,000 kilometers away from a prior location within one hour:

```tql
from {
  time: 2024-01-01T10:00:00,
  user: {name: "alice"},
  src_endpoint: {
    location: {city: "San Francisco", long: -122.4194, lat: 37.7749},
  },
}, {
  time: 2024-01-01T10:30:00,
  user: {name: "alice"},
  src_endpoint: {
    location: {city: "Berlin", long: 13.405, lat: 52.52},
  },
}
group user.name {
  window size=1h, trailing=true, on=time, tolerance=1min {
    summarize logins=count(),
              max_distance_m=max(
                geo_distance(
                  src_endpoint.location.long,
                  src_endpoint.location.lat,
                  $window.event.src_endpoint.location.long,
                  $window.event.src_endpoint.location.lat,
                  spheroid=true,
                ),
              )
    where logins >= 2 and max_distance_m > 1M
    this = {
      ...$window.event,
      max_distance_m: int(max_distance_m),
      evidence_start: $window.start,
      evidence_end: $window.end,
    }
  }
}
select user=user.name,
       city=src_endpoint.location.city,
       max_distance_m,
       evidence_start,
       evidence_end
```

```tql
{
  user: "alice",
  city: "Berlin",
  max_distance_m: 9128788,
  evidence_start: 2024-01-01T09:30:00Z,
  evidence_end: 2024-01-01T10:30:00Z,
}
```

The per-user [`group`](https://tenzir.com/docs/reference/operators/group.md) isolates login histories. For each event, the trailing [`window`](https://tenzir.com/docs/reference/operators/window.md) retains the preceding hour, while `$window.event` provides the current location. The one-minute `tolerance` reorders slightly late login events before evaluating their histories. [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) calculates the greatest distance between the current location and every login in the retained history.

### Compare only consecutive logins

The window checks the current login against every login in the preceding hour. When a detection needs only the immediately preceding login for each user, use [`lag`](https://tenzir.com/docs/reference/operators/lag.md) to attach it directly. For the same input data, replace the `group` and `window` block and the following `select` with:

```tql
group user.name {
  reorder on=time, tolerance=1min
  lag into=previous
  where previous != null
  distance_m = geo_distance(
    src_endpoint.location.long,
    src_endpoint.location.lat,
    previous.src_endpoint.location.long,
    previous.src_endpoint.location.lat,
    spheroid=true,
  )
  travel_time = time - previous.time
  where travel_time <= 1h and distance_m > 1M
  select user=user.name,
         city=src_endpoint.location.city,
         previous_city=previous.src_endpoint.location.city,
         distance_m=int(distance_m),
         travel_time
}
```

```tql
{
  user: "alice",
  city: "Berlin",
  previous_city: "San Francisco",
  distance_m: 9128788,
  travel_time: 30min,
}
```

The [`group`](https://tenzir.com/docs/reference/operators/group.md) operator gives each user an independent subpipeline and watermark. Within it, [`reorder`](https://tenzir.com/docs/reference/operators/reorder.md) repairs up to one minute of event-time disorder before `lag` attaches the preceding login. This one-predecessor form updates one retained event per login instead of replaying a one-hour history through a new subpipeline. Keep the trailing-window form when the detection must compare the current event with every event in the lookback period.

The `travel_time` predicate enforces the one-hour event-time horizon for matches, but it doesn’t expire group or lag state. This form keeps one subpipeline and one complete preceding event for every user until the input ends. Avoid it on unbounded streams with high-cardinality or attacker-controlled user names unless the source limits that cardinality. You can instead enclose `group` and `lag` in a fixed window to bound their lifetime when resetting each user’s predecessor at window boundaries fits the detection.

IP geolocation can be imprecise, and VPNs, proxies, and mobile networks can produce legitimate jumps. Treat this pattern as a signal to combine with device identity, authentication strength, and network ownership rather than as a standalone verdict.

## Compare observations with a rolling baseline

A rolling-baseline detector compares recent observations with historical context. This section develops that pattern from threshold calculation to duplicate suppression and OCSF finding output, using an SMB traffic spike detector as the concrete example. The rolling window carries its history in stream state, which suits horizons of minutes to hours; for baselines learned over days or weeks, the guide on [baselining behavior from stored events](baseline-from-stored-events.md) moves the learning into a scheduled pipeline.

### Calculate a rolling threshold

Compute a baseline with statistical aggregations inside a hopping [`window`](https://tenzir.com/docs/reference/operators/window.md), then compare the candidate observation with that baseline. The detector uses the mean for the center and [standard deviation](https://en.wikipedia.org/wiki/Standard_deviation) for the dispersion, the spread of values around that center. The example is a lightweight TQL adaptation of Splunk’s [SMB Traffic Spike](https://github.com/splunk/security_content/blob/4493a82b24dc7e93a612c229e842751c853b96c8/detections/network/smb_traffic_spike.yml) analytic. It starts with pre-aggregated OCSF SMB Activity buckets to keep the detection readable and interleaves the sources by timestamp to match event-time order. The sample records show only the OCSF fields used by the detection.

```tql
from {time: 2024-01-01T00:00:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 10}},
     {time: 2024-01-01T00:00:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 120}},
     {time: 2024-01-01T00:10:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 11}},
     {time: 2024-01-01T00:10:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 118}},
     {time: 2024-01-01T00:20:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 9}},
     {time: 2024-01-01T00:20:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 121}},
     {time: 2024-01-01T00:30:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 10}},
     {time: 2024-01-01T00:30:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 119}},
     {time: 2024-01-01T00:40:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 10}},
     {time: 2024-01-01T00:40:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 122}},
     {time: 2024-01-01T00:50:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 10}},
     {time: 2024-01-01T00:50:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 120}},
     {time: 2024-01-01T01:00:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 80}},
     {time: 2024-01-01T01:00:00, src_endpoint: {hostname: "file-server-1"}, traffic: {bytes: 123}}
window size=70min, every=10min, on=time {
  summarize src=src_endpoint.hostname,
            samples=count(),
            avg_bytes=mean(traffic.bytes),
            stdev_bytes=stddev(traffic.bytes),
            current_bytes=max(traffic.bytes)
  upper_bound = avg_bytes + stdev_bytes * 2
  where samples >= 5 and current_bytes > upper_bound
  start = $window.start
  end = $window.end
}
select src, current_bytes, upper_bound, start, end
sort start
```

```tql
{
  src: "workstation-7",
  current_bytes: 80,
  upper_bound: 69.00145770426485,
  start: 2024-01-01T00:00:00Z,
  end: 2024-01-01T01:10:00Z,
}
{
  src: "workstation-7",
  current_bytes: 80,
  upper_bound: 73.85436210874914,
  start: 2024-01-01T00:10:00Z,
  end: 2024-01-01T01:20:00Z,
}
```

The `workstation-7` bucket with `80` bytes exceeds the mean plus two standard deviations in two 70-minute windows, while the steady file-server traffic stays below its bound. The simplified detector uses the maximum bucket in each window as the candidate spike.

This example uses a fixed hopping window: `size=70min` defines the lookback and `every=10min` moves the window forward every 10 minutes. Around midnight, Tenzir evaluates intervals such as `[00:00, 01:10)`, `[00:10, 01:20)`, and `[00:20, 01:30)`. A 10-minute traffic bucket can participate in multiple open windows, which gives rolling context but also fires repeatedly for the same spike, as the doubled output shows. The suppression step removes those duplicates before finding conversion. The example stays close to the upstream analytic and omits `tolerance`. Production deployments should keep the stream-wide window on the outside so it bounds all keyed state, group sources inside it as this keyed [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) already does, and size a tolerance for ingestion skew.

In OCSF [Network Activity](https://schema.ocsf.io/classes/network_activity) and [SMB Activity](https://schema.ocsf.io/classes/smb_activity) events, `traffic.bytes` is a per-observation measurement, so summing it across a window is correct. Do not aggregate `cumulative_traffic.bytes` the same way: it carries running totals, and repeatedly summing it counts the same bytes many times over.

Pre-aggregate raw events

If your input stream contains one OCSF SMB Activity event per file operation, pre-aggregate it into 10-minute bucket events before running the spike detector:

```tql
from {class_uid: 4006, time: 2024-01-01T00:00:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 4}},
     {class_uid: 4006, time: 2024-01-01T00:03:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 6}},
     {class_uid: 4006, time: 2024-01-01T00:10:00, src_endpoint: {hostname: "workstation-7"}, traffic: {bytes: 11}}
// class_name: "SMB Activity"
where class_uid == 4006
window size=10min, on=time, tolerance=2min {
  summarize src=src_endpoint.hostname, smb_bytes=sum(traffic.bytes)
  time = $window.start
  src_endpoint = {hostname: src}
  traffic = {bytes: smb_bytes}
}
select time, src_endpoint, traffic
sort time
```

```tql
{
  time: 2024-01-01T00:00:00Z,
  src_endpoint: {
    hostname: "workstation-7",
  },
  traffic: {
    bytes: 10,
  },
}
{
  time: 2024-01-01T00:10:00Z,
  src_endpoint: {
    hostname: "workstation-7",
  },
  traffic: {
    bytes: 11,
  },
}
```

This keeps the detector focused on the rolling statistical comparison while the pre-aggregation step handles the raw event volume.

### Suppress overlapping results

Hopping windows trade duplicate results for rolling context: one spike produces a candidate in every open window that contains it. Suppress the repeats with [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md) keyed on the detection identity. The following pipeline runs on the same SMB example data:

```tql
window size=70min, every=10min, on=time {
  summarize src=src_endpoint.hostname,
            samples=count(),
            avg_bytes=mean(traffic.bytes),
            stdev_bytes=stddev(traffic.bytes),
            current_bytes=max(traffic.bytes)
  upper_bound = avg_bytes + stdev_bytes * 2
  where samples >= 5 and current_bytes > upper_bound
  start = $window.start
  end = $window.end
}
select src, current_bytes, upper_bound, start, end
sort start
deduplicate src, create_timeout=70min
```

```tql
{
  src: "workstation-7",
  current_bytes: 80,
  upper_bound: 69.00145770426485,
  start: 2024-01-01T00:00:00Z,
  end: 2024-01-01T01:10:00Z,
}
```

The key (`src`) defines what counts as “the same result”, and `create_timeout` sets a fixed suppression interval: it starts when the first result for a key is emitted, suppressed repeats do not extend it, and once it expires the next spike on the same host emits another result. Match it to the window size so one spike emits at most once per lookback. For inactivity-based expiry, where the interval restarts whenever the key is seen, use `read_timeout` instead.

Both timeouts count wall-clock time, not event time. On a live stream, suppression usually tracks the detector cadence. Replaying history faster than real time compresses independent spikes into one suppression interval, keeping only the first result per key. Skip suppression when replaying, or accept that behavior.

The `sort start` exists for this bounded example, where all windows flush at end of input in unspecified order. A live stream needs no sort: windows close as event time advances, and [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md) keeps whichever result for the spike arrives first, which is exactly what you want from suppression.

### Emit a finding with the evidence window

As with single-event detections, windowed detections should emit OCSF [Detection Finding](https://schema.ocsf.io/classes/detection_finding) events. The finding’s `time` records when the finding was created, while `start_time` and `end_time` carry the evidence window. Use `now()` in a live pipeline. The example data uses a fixed creation time so its output stays reproducible.

The analytic type describes the method, not the presence of a window. This SMB baseline uses `type_id: 3` (`Statistical`); a fixed count threshold can remain `type_id: 1` (`Rule`). Using the same SMB example data:

```tql
let $finding_time = 2024-01-01T01:10:01Z


window size=70min, every=10min, on=time {
  summarize src=src_endpoint.hostname,
            samples=count(),
            avg_bytes=mean(traffic.bytes),
            stdev_bytes=stddev(traffic.bytes),
            current_bytes=max(traffic.bytes)
  upper_bound = avg_bytes + stdev_bytes * 2
  where samples >= 5 and current_bytes > upper_bound
  start = $window.start
  end = $window.end
}
sort start
deduplicate src, create_timeout=70min
// Reshape the result into a Detection Finding.
this = {
  time: $finding_time, // use now() in a live pipeline
  metadata: {
    product: {name: "Tenzir", vendor_name: "Tenzir"},
    uid: f"finding-create-smb-spike-{src}-{start}",
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
    uid: f"smb-spike-{src}-{start}",
    title: f"SMB traffic spike on {src}",
    analytic: {
      name: "SMB traffic spike",
      uid: "smb_traffic_spike",
      type_id: 3,
    },
  },
  device: {hostname: src},
  unmapped: {
    current_bytes: current_bytes,
    upper_bound: upper_bound,
  },
}
type_uid = class_uid * 100 + activity_id
```

```tql
{
  time: 2024-01-01T01:10:01Z,
  metadata: {
    product: {
      name: "Tenzir",
      vendor_name: "Tenzir",
    },
    uid: "finding-create-smb-spike-workstation-7-2024-01-01T00:00:00Z",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 3,
  status_id: 1,
  is_alert: true,
  start_time: 2024-01-01T00:00:00Z,
  end_time: 2024-01-01T01:10:00Z,
  finding_info: {
    uid: "smb-spike-workstation-7-2024-01-01T00:00:00Z",
    title: "SMB traffic spike on workstation-7",
    analytic: {
      name: "SMB traffic spike",
      uid: "smb_traffic_spike",
      type_id: 3,
    },
  },
  device: {
    hostname: "workstation-7",
  },
  unmapped: {
    current_bytes: 80,
    upper_bound: 69.00145770426485,
  },
  type_uid: 200401,
}
```

Detector-specific measurements such as the observed value and the threshold have no schema field, so they travel in `unmapped`. Only populate `unmapped` when it has content.

Windowed findings feed naturally into composition: a multi-stage detector can require a statistical spike and a rule-based sighting on the same host before escalating, which is exactly what the guide on [creating multi-stage detectors](create-multi-stage-detectors.md) builds.

## Detect network behaviors on one stream

The same building blocks cover the classic network detections. These examples read OCSF [Network Activity](https://schema.ocsf.io/classes/network_activity) events, so one normalized stream serves every detector whether a flow exporter, a firewall, or Zeek produced the record. For the evasion and tuning trade-offs behind each, see the blog post on [detecting scans, beacons, and exfiltration](https://tenzir.com/blog/detect-scans-beacons-and-exfiltration-over-streaming-ocsf.md).

### Find scan fan-out

A scanner contacts many endpoints with small flows, and most of its probes go unanswered. Fan-out alone also flags a busy client, so pair it with failure evidence: a TCP flow whose cumulative flags never include the ACK bit (`16`) never completed a handshake. Counting `connection_info.tcp_flags` tallies only the flows carrying flags, so UDP and ICMP probes neither satisfy nor dilute the ratio:

```tql
let $min_flows = 5
let $max_packets_per_flow = 5
let $min_fanout = 5
let $min_unanswered_share = 0.8


from {time: 2024-01-01T10:00:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 10.0.1.1, port: 22}, traffic: {packets: 1}, connection_info: {tcp_flags: 2}},
     {time: 2024-01-01T10:00:05, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 10.0.1.2, port: 22}, traffic: {packets: 1}, connection_info: {tcp_flags: 2}},
     {time: 2024-01-01T10:00:10, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 10.0.1.3, port: 22}, traffic: {packets: 1}, connection_info: {tcp_flags: 2}},
     {time: 2024-01-01T10:00:15, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 10.0.1.4, port: 445}, traffic: {packets: 2}, connection_info: {tcp_flags: 6}},
     {time: 2024-01-01T10:00:20, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9}, dst_endpoint: {ip: 10.0.1.5, port: 445}, traffic: {packets: 1}, connection_info: {tcp_flags: 2}},
     {time: 2024-01-01T10:00:25, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.4}, dst_endpoint: {ip: 10.0.2.1, port: 443}, traffic: {packets: 48}, connection_info: {tcp_flags: 27}}
// class_name: "Network Activity", activity_name: "Traffic"
where class_uid == 4001 and activity_id == 6
window size=5min, on=time, tolerance=30s, idle_timeout=2min {
  group src_endpoint.ip {
    summarize flows=count(),
              targets=count_distinct(dst_endpoint.ip),
              ports=count_distinct(dst_endpoint.port),
              avg_packets=mean(traffic.packets),
              tcp_flows=count(connection_info.tcp_flags),
              unanswered=count_if(connection_info.tcp_flags,
                                  flags => bit_and(flags, 16) == 0)
    src_ip = $group
    start = $window.start
    end = $window.end
  }
}
where flows >= $min_flows and
      avg_packets <= $max_packets_per_flow and
      (targets >= $min_fanout or ports >= $min_fanout) and
      (tcp_flows == 0 or unanswered >= tcp_flows * $min_unanswered_share)
select src_ip, flows, targets, ports, unanswered, tcp_flows, start, end
```

```tql
{
  src_ip: 10.0.0.9,
  flows: 5,
  targets: 5,
  ports: 2,
  unanswered: 5,
  tcp_flows: 5,
  start: 2024-01-01T10:00:00Z,
  end: 2024-01-01T10:05:00Z,
}
```

The busy host at `10.0.0.4` never appears: its single answered flow carries too many packets and reaches only one target. Production thresholds are much higher than in this example, and approved scanners belong in an allow list.

### Score beacon cadence

An implant checking in on a timer produces stable inter-arrival intervals and flow byte counts per connection tuple. Scoring that regularity needs estimators that survive a missed check-in, which the guide on [detecting periodic behavior](detect-periodic-behavior.md) covers, along with the long connections that beacon scoring cannot see.

### Sum outbound volume per asset

Exfiltration detection needs a trust boundary, which comes from enrichment rather than from the flow record. Once asset context stamps `network_scope_id` on both endpoints, sum the per-observation `traffic.bytes_out` per internal asset:

```tql
let $min_bytes_out = 500M


from {time: 2024-01-01T10:00:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9, network_scope_id: 1}, dst_endpoint: {ip: 203.0.113.5, network_scope_id: 2}, traffic: {bytes_out: 400000000}},
     {time: 2024-01-01T10:04:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.9, network_scope_id: 1}, dst_endpoint: {ip: 203.0.113.6, network_scope_id: 2}, traffic: {bytes_out: 250000000}},
     {time: 2024-01-01T10:07:00, class_uid: 4001, activity_id: 6, src_endpoint: {ip: 10.0.0.4, network_scope_id: 1}, dst_endpoint: {ip: 203.0.113.7, network_scope_id: 2}, traffic: {bytes_out: 12000000}}
where class_uid == 4001 and activity_id == 6
where src_endpoint.network_scope_id == 1 and
      dst_endpoint.network_scope_id == 2
window size=15min, on=time, tolerance=1min, idle_timeout=5min {
  group src_endpoint.ip {
    summarize bytes_out=sum(traffic.bytes_out),
              destinations=count_distinct(dst_endpoint.ip)
    asset = $group
    start = $window.start
    end = $window.end
  }
}
where bytes_out >= $min_bytes_out
select asset, bytes_out, destinations, start, end
```

```tql
{
  asset: 10.0.0.9,
  bytes_out: 650000000,
  destinations: 2,
  start: 2024-01-01T10:00:00Z,
  end: 2024-01-01T10:15:00Z,
}
```

Summing per asset rather than per connection defeats chunked transfers that stay under a per-connection limit, since every chunk lands in the same bucket. A fixed threshold remains weak across a mixed fleet, so replace it with the rolling baseline from the previous section once each asset has enough history.

## See Also

* [Detections](../../explanations/detections.md)
* [`window`](https://tenzir.com/docs/reference/operators/window.md)
* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md)
* [`every`](https://tenzir.com/docs/reference/operators/every.md)
* [`count_distinct`](https://tenzir.com/docs/reference/functions/count_distinct.md)
* [`count_if`](https://tenzir.com/docs/reference/functions/count_if.md)
* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`stddev`](https://tenzir.com/docs/reference/functions/stddev.md)
* [Window event streams](../analyze/window-event-streams.md)
* [Baseline behavior from stored events](baseline-from-stored-events.md)
* [Detect periodic behavior](detect-periodic-behavior.md)
* [Match events with TQL](match-events-with-tql.md)
* [Model detections in OCSF](model-detections-in-ocsf.md)
* [Execute Sigma rules](execute-sigma-rules.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
