---
title: "Create multi-stage detectors"
description: "Combine independent detections into higher-confidence verdicts with correlation combinators, cross-stage state, and suppression"
canonical: https://tenzir.com/docs/guides/detect/create-multi-stage-detectors
source: https://tenzir.com/docs/guides/detect/create-multi-stage-detectors.md
section: "Docs"
---

# Create multi-stage detectors

> Combine independent detections into higher-confidence verdicts with correlation combinators, cross-stage state, and suppression

This guide shows you how to compose detections. A single sighting is a weak signal; several independent sightings on the same entity within a short time tell a story. A multi-stage detector has two parts: **stages** that each emit OCSF [Detection Finding](https://schema.ocsf.io/classes/detection_finding) events, and a **combinator** that decides when the combined evidence warrants a verdict.

The guide follows that flow: separate the stages from their correlation, choose the matching semantics, manage state, and model the combined result.

## Separate stages from correlation

Connect stages through topics with [`publish`](https://tenzir.com/docs/reference/operators/publish.md) and [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md): a pipeline that publishes to a topic fans its events out to every pipeline subscribed to it, decoupling producers from consumers. This makes each stage an independently deployable, restartable pipeline instead of one monolith:

```tql
// Stage 1: a rule-based detection over process events.
subscribe "ocsf.process-activity"
windows_threats::detections::print_sensitive_dump
publish "detections"
```

A second stage can publish findings to the same topic:

```tql
// Stage 2: a statistical detection over SMB traffic.
subscribe "ocsf.smb-activity"
windows_threats::detections::smb_traffic_spike
publish "detections"
```

The combinator consumes the shared stream of findings:

```tql
// Combinator: subscribe to all stage findings and correlate.
subscribe "detections"
// class_name: "Detection Finding"
where class_uid == 2004
// ...correlation logic...
publish "detections.multi-stage"
```

A stage can call one packaged operator that both matches and models the result, as shown here, or compose smaller operators before publishing. The guides on [matching events with TQL](match-events-with-tql.md), [modeling detections in OCSF](model-detections-in-ocsf.md), and [detecting over time windows](detect-over-time-windows.md) cover those building blocks. As long as every stage publishes the same Detection Finding contract, the combinator needs no knowledge of how each detection works internally.

## Correlate stages within a window

The simplest combinators ask whether several stages fired for the same entity within a time window, together or in a required order. These correspond to Sigma’s `temporal` and `temporal_ordered` correlation types. The examples in this section show how both types translate to TQL. The example data sets are simplified sightings carrying `time`, `host`, and `rule`. In production, these values come from Detection Finding fields: `device.hostname` for the host and `finding_info.analytic.uid` for the rule. The combined-finding example maps those fields into a complete verdict.

These examples use fixed, epoch-aligned time bins. For a sliding “within N minutes of each other” interpretation, use a hopping window instead, as shown in [`window`](https://tenzir.com/docs/reference/operators/window.md#detect-brute-force-logins-with-a-hopping-window). The examples share one event-time clock across hosts and omit `tolerance`. In production, keep [`window`](https://tenzir.com/docs/reference/operators/window.md) on the outside so closing it also expires all high-cardinality correlation groups. Put [`group`](https://tenzir.com/docs/reference/operators/group.md) inside the window when a correlation needs a full keyed subpipeline, and size `tolerance` for ingestion skew. Use an outer group only when each entity must advance its own event-time clock.

### Match stages in any order

A `temporal` correlation fires when several different rules match for the same group within a window, in any order:

```tql
from {time: 2026-07-01T10:00:00Z, host: "ws-17", rule: "recon"},
     {time: 2026-07-01T10:03:00Z, host: "ws-17", rule: "exploit"},
     {time: 2026-07-01T10:06:00Z, host: "ws-17", rule: "exfil"},
     {time: 2026-07-01T10:01:00Z, host: "ws-9", rule: "recon"}
window size=10min, on=time {
  summarize host, rules=distinct(rule)
  where rules.search("recon") and rules.search("exploit") and rules.search("exfil")
}
```

```tql
{
  host: "ws-17",
  rules: [
    "exploit",
    "exfil",
    "recon",
  ],
}
```

### Match first occurrences in order

A `temporal_ordered` correlation adds sequence. Compare the first occurrence of each stage: aggregate a per-stage timestamp with [`min`](https://tenzir.com/docs/reference/functions/min.md) over a conditional expression, then require the timestamps to be strictly ordered. This tolerates repeated sightings of a stage, which real detections produce routinely. In this example, `ws-17` triggers `recon` twice before progressing and still matches, while `ws-9` saw all three stages in the wrong order and stays silent:

```tql
from {time: 2026-07-01T10:00:00Z, host: "ws-17", rule: "recon"},
     {time: 2026-07-01T10:01:00Z, host: "ws-17", rule: "recon"},
     {time: 2026-07-01T10:03:00Z, host: "ws-17", rule: "exploit"},
     {time: 2026-07-01T10:06:00Z, host: "ws-17", rule: "exfil"},
     {time: 2026-07-01T10:00:30Z, host: "ws-9", rule: "exfil"},
     {time: 2026-07-01T10:02:00Z, host: "ws-9", rule: "exploit"},
     {time: 2026-07-01T10:04:00Z, host: "ws-9", rule: "recon"},
     {time: 2026-07-01T10:05:00Z, host: "ws-5", rule: "recon"}
window size=10min, on=time {
  summarize host,
    recon_time=min(time if rule == "recon" else null),
    exploit_time=min(time if rule == "exploit" else null),
    exfil_time=min(time if rule == "exfil" else null)
  where recon_time != null and exploit_time != null and exfil_time != null \
    and recon_time < exploit_time and exploit_time < exfil_time
}
```

```tql
{
  host: "ws-17",
  recon_time: 2026-07-01T10:00:00Z,
  exploit_time: 2026-07-01T10:03:00Z,
  exfil_time: 2026-07-01T10:06:00Z,
}
```

The `!= null` guards drop hosts that never completed all three stages, such as `ws-5`, without producing warnings. Because [`min`](https://tenzir.com/docs/reference/functions/min.md) is order-independent, this shape needs no upfront sort and works the same on unbounded streams.

This checks a **strict progression**, where each stage first appears after the previous stage first appeared. A host where `exploit` fires once before `recon` does not match, even if a valid ordered chain follows.

### Match an ordered subsequence

Some detectors should accept a valid ordered chain even when an earlier stage appears out of order. For these looser **subsequence** semantics, collect the sequence and scan it:

```tql
from {time: 2026-07-01T10:00:00Z, host: "ws-17", rule: "exploit"},
     {time: 2026-07-01T10:01:00Z, host: "ws-17", rule: "recon"},
     {time: 2026-07-01T10:02:00Z, host: "ws-17", rule: "exploit"},
     {time: 2026-07-01T10:03:00Z, host: "ws-17", rule: "exfil"},
     {time: 2026-07-01T10:00:30Z, host: "ws-9", rule: "exfil"},
     {time: 2026-07-01T10:02:00Z, host: "ws-9", rule: "exploit"},
     {time: 2026-07-01T10:04:00Z, host: "ws-9", rule: "recon"}
window size=10min, on=time {
  sort time
  summarize host, sequence=collect(rule)
}
target_sequence = sequence.where(
  rule => rule == "recon" or rule == "exploit" or rule == "exfil"
)
where target_sequence.join(",").match_regex(r"recon.*exploit.*exfil")
drop target_sequence
```

```tql
{
  host: "ws-17",
  sequence: [
    "exploit",
    "recon",
    "exploit",
    "exfil",
  ],
}
```

Here `ws-17` matches despite the early `exploit`, because `recon` at 10:01, `exploit` at 10:02, and `exfil` at 10:03 form the required subsequence. The exact-equality filter removes unrelated rule names before scanning, so names that only contain a stage name cannot satisfy the correlation. [`collect`](https://tenzir.com/docs/reference/functions/collect.md) keeps arrival order (unlike [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md)), so [`sort`](https://tenzir.com/docs/reference/operators/sort.md) establishes event-time order inside each window before the collection. Keeping the sort inside the window bounds its input; a global sort would wait forever on a live stream.

### Accumulate risk per entity

The previous combinators ask *whether* stages fired. Risk accumulation asks *how much* evidence accrued: every finding contributes a score, the combinator sums scores per entity, and a verdict fires when the total crosses a threshold. This absorbs low-confidence detections that should not alert on their own, the evidence posture described in the explanation of [alerting postures](../../explanations/detections.md#choose-the-alerting-posture), and mirrors the risk-based alerting model that SIEM correlation rules built on scored observations use.

The example data carries a `risk` score per sighting. Requiring both a risk threshold and at least two distinct analytics keeps one noisy detection from alerting by itself: `ws-17` crosses the threshold with three different analytics, while `ws-9` accumulates two sightings of the same analytic and stays silent on both grounds:

```tql
let $risk_threshold = 60


from {time: 2026-07-01T09:10:00Z, host: "ws-17", rule: "beacon_cadence", risk: 25},
     {time: 2026-07-01T11:40:00Z, host: "ws-17", rule: "smb_traffic_spike", risk: 20},
     {time: 2026-07-01T13:05:00Z, host: "ws-17", rule: "outbound_volume_burst", risk: 30},
     {time: 2026-07-01T10:00:00Z, host: "ws-9", rule: "smb_traffic_spike", risk: 20},
     {time: 2026-07-01T12:30:00Z, host: "ws-9", rule: "smb_traffic_spike", risk: 20}
window size=24h, on=time {
  summarize host,
            risk=sum(risk),
            analytics=distinct(rule),
            first_seen=min(time),
            last_seen=max(time)
  where risk >= $risk_threshold and analytics.length() >= 2
}
```

```tql
{
  host: "ws-17",
  risk: 75,
  analytics: [
    "outbound_volume_burst",
    "beacon_cadence",
    "smb_traffic_spike",
  ],
  first_seen: 2026-07-01T09:10:00Z,
  last_seen: 2026-07-01T13:05:00Z,
}
```

In production, the scores come from the findings themselves: stages stamp the OCSF `risk_score` field when they emit a Detection Finding, and the combinator groups by the entity fields the findings share, such as `device.hostname` or `actor.user.name`. Enrichment can scale a stage’s base score by asset criticality before the sum. For a sliding risk horizon, use a hopping window (`every=`) and suppress the repeated verdicts it produces, as shown in [suppressing repeated verdicts](create-multi-stage-detectors.md#suppress-repeated-verdicts).

## Manage state beyond the window

A combinator sometimes needs memory independent of one correlation window: persistent facts that survive restarts or a re-alert interval after a verdict. Keep these stateful concerns in the combinator rather than individual stages.

### Remember facts with a context

Lookup-table contexts provide state that outlives any window and is shared across all pipelines of a node. Use them for questions such as “is this the first time we see this host?”, “is this rule rare in our fleet?”, or “did this entity trip a different stage recently?”

Create the context once:

```tql
context_create_lookup_table "seen_hosts"
```

Then filter findings to first-time hosts. [`context_enrich`](https://tenzir.com/docs/reference/operators/context_enrich.md) adds a field named after the context, which stays `null` for unknown keys, and [`context_update`](https://tenzir.com/docs/reference/operators/context_update.md) remembers the key. Two details make the pipeline correct: `context_update` consumes its input without emitting anything, so it runs on a [`fork`](https://tenzir.com/docs/reference/operators/fork.md) branch while the main stream continues; and because the enrich step runs before the update lands, several findings for the same new host can be in flight together, all still enriched with `null`, so [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md) closes that gap inside the pipeline. Its `create_timeout` only needs to outlast the context update; keeping it short stops the in-pipeline cache from growing with hostname cardinality:

```tql
from {time: 2026-07-01T10:00:00Z, host: "ws-17", rule: "print-dump"},
     {time: 2026-07-01T10:02:00Z, host: "ws-17", rule: "encoded-powershell"},
     {time: 2026-07-01T10:05:00Z, host: "ws-9", rule: "smb-spike"}
context_enrich "seen_hosts", key=host
where seen_hosts == null
drop seen_hosts
deduplicate host, create_timeout=1min
fork {
  context_update "seen_hosts", key=host, value=time
}
```

The first run emits one finding per host. Neither host is known yet, and the second `ws-17` sighting arrives before the context update lands, so [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md) suppresses it:

```tql
{
  time: 2026-07-01T10:00:00Z,
  host: "ws-17",
  rule: "print-dump",
}
{
  time: 2026-07-01T10:05:00Z,
  host: "ws-9",
  rule: "smb-spike",
}
```

Running the same pipeline again emits nothing: the context remembered both hosts, and the state survives pipeline restarts because it lives in the node, not in the pipeline. The context provides the persistence, the in-pipeline [`deduplicate`](https://tenzir.com/docs/reference/operators/deduplicate.md) the atomicity. Contexts require a Tenzir Node, and the guide on [using lookup tables](../enrich/use-lookup-tables.md) covers the full toolbox, including timestamp-valued entries for “seen recently” logic that expires.

### Suppress repeated verdicts

Suppression belongs after the combinator, keyed on the identity of the combined verdict:

```tql
subscribe "detections"
// ...correlation logic...
deduplicate host, create_timeout=1h
publish "detections.multi-stage"
```

Two placements are tempting but wrong:

* **Inside a stage.** A stage that suppresses its own findings starves every combinator that needs repeat counts, such as `event_count`. Stages emit every sighting; consumers decide what is noise.
* **After publishing.** Each subscriber would need its own identical suppression. Deduplicate once, before the verdict topic.

The `create_timeout` sets the re-alert interval: one verdict per host per hour in this example.

## Model the combined verdict

A combinator should publish a complete result rather than a Boolean match alone. Its output follows the same OCSF contract as the stages while preserving the identity and time range of the contributing evidence.

### Link the contributing findings

The combined verdict is itself an OCSF Detection Finding (`class_uid: 2004`). It links the contributing findings through `finding_info.related_events`, where each entry’s `uid` carries the `metadata.uid` of a source finding. Every stage that participates in this composition must populate that event identifier; `finding_info.uid` remains the identity of the logical finding across lifecycle events. The following pipeline correlates three stage findings on the same host and rolls them up. It first narrows the stream to the three stage analytics, so unrelated findings on the same host can neither leak into `related_events` nor stretch the evidence window:

```tql
let $stage_uids = [
  "recon_scan",
  "windows_threats::print_sensitive_dump",
  "smb_traffic_spike",
]
let $finding_time = 2026-07-01T10:06:05Z


from {
  time: 2026-07-01T10:00:00Z,
  metadata: {uid: "finding-create-recon-ws-17-1000", version: "1.9.0"},
  class_uid: 2004,
  device: {hostname: "ws-17"},
  finding_info: {
    uid: "recon-ws-17-1000",
    analytic: {name: "Recon scan", uid: "recon_scan", type_id: 1},
  },
}, {
  time: 2026-07-01T10:03:00Z,
  metadata: {uid: "finding-create-print-dump-ws-17-1003", version: "1.9.0"},
  class_uid: 2004,
  device: {hostname: "ws-17"},
  finding_info: {
    uid: "exploit-ws-17-1003",
    analytic: {
      name: "Sensitive File Dump Via Print.EXE",
      uid: "windows_threats::print_sensitive_dump",
      type_id: 1,
    },
  },
}, {
  time: 2026-07-01T10:06:00Z,
  metadata: {uid: "finding-create-smb-spike-ws-17-1006", version: "1.9.0"},
  class_uid: 2004,
  device: {hostname: "ws-17"},
  finding_info: {
    uid: "exfil-ws-17-1006",
    analytic: {name: "SMB traffic spike", uid: "smb_traffic_spike", type_id: 3},
  },
}, {
  time: 2026-07-01T10:01:00Z,
  metadata: {uid: "finding-create-recon-ws-9-1001", version: "1.9.0"},
  class_uid: 2004,
  device: {hostname: "ws-9"},
  finding_info: {
    uid: "recon-ws-9-1001",
    analytic: {name: "Recon scan", uid: "recon_scan", type_id: 1},
  },
}
// class_name: "Detection Finding"
where class_uid == 2004
where finding_info.analytic.uid in $stage_uids
window size=10min, on=time {
  summarize host=device.hostname,
            stages=distinct(finding_info.analytic.uid),
            source_event_uids=collect(metadata.uid),
            first=min(time),
            last=max(time)
  where stages.search("recon_scan") \
    and stages.search("windows_threats::print_sensitive_dump") \
    and stages.search("smb_traffic_spike")
}
this = {
  time: $finding_time, // use now() in a live pipeline
  metadata: {
    product: {name: "Tenzir", vendor_name: "Tenzir"},
    uid: f"finding-create-multistage-{host}-{first}",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 5,
  status_id: 1,
  is_alert: true,
  start_time: first,
  end_time: last,
  finding_info: {
    uid: f"multistage-{host}-{first}",
    title: f"Multi-stage intrusion on {host}",
    analytic: {
      name: "Multi-stage intrusion",
      uid: "multistage_intrusion",
      type_id: 1,
    },
    related_events: source_event_uids.map(uid => {uid: uid}),
    related_events_count: source_event_uids.length(),
  },
  device: {hostname: host},
}
type_uid = class_uid * 100 + activity_id
```

```tql
{
  time: 2026-07-01T10:06:05Z,
  metadata: {
    product: {
      name: "Tenzir",
      vendor_name: "Tenzir",
    },
    uid: "finding-create-multistage-ws-17-2026-07-01T10:00:00Z",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 5,
  status_id: 1,
  is_alert: true,
  start_time: 2026-07-01T10:00:00Z,
  end_time: 2026-07-01T10:06:00Z,
  finding_info: {
    uid: "multistage-ws-17-2026-07-01T10:00:00Z",
    title: "Multi-stage intrusion on ws-17",
    analytic: {
      name: "Multi-stage intrusion",
      uid: "multistage_intrusion",
      type_id: 1,
    },
    related_events: [
      {
        uid: "finding-create-recon-ws-17-1000",
      },
      {
        uid: "finding-create-print-dump-ws-17-1003",
      },
      {
        uid: "finding-create-smb-spike-ws-17-1006",
      },
    ],
    related_events_count: 3,
  },
  device: {
    hostname: "ws-17",
  },
  type_uid: 200401,
}
```

The verdict follows the same conventions as its stages: `time` records when the combined finding was created, `start_time` and `end_time` span the contributing evidence, and the severity reflects the combination, not any single stage. What makes it a multi-stage verdict is the linkage: `related_events` and `related_events_count` let analysts pivot from the verdict to every contributing finding.

### Escalate through an incident workflow

A multi-stage match is still a Detection Finding. OCSF reserves [Incident Finding](https://schema.ocsf.io/classes/incident_finding) (`class_uid: 2005`) for records that a workflow acts on: it requires `finding_info_list` and an `activity_id` from its Create/Update/Close lifecycle, and recommends `impact`, `priority`, and `desc`. Emit one only when your pipeline genuinely opens incidents, for example when handing off to a case management system, and set `is_alert: true` on creation, not on updates or closes. Until then, a Detection Finding with `related_events` carries the full composition story.

## See Also

* [Detections](../../explanations/detections.md)
* [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md)
* [`collect`](https://tenzir.com/docs/reference/functions/collect.md)
* [`min`](https://tenzir.com/docs/reference/functions/min.md)
* [Match events with TQL](match-events-with-tql.md)
* [Model detections in OCSF](model-detections-in-ocsf.md)
* [Detect over time windows](detect-over-time-windows.md)
* [Use lookup tables](../enrich/use-lookup-tables.md)
