---
title: "Baseline behavior from stored events"
description: "Learn per-entity baselines from stored events on a schedule, publish them as lookup tables, and judge live streams with robust scores"
canonical: https://tenzir.com/docs/guides/detect/baseline-from-stored-events
source: https://tenzir.com/docs/guides/detect/baseline-from-stored-events.md
section: "Docs"
---

# Baseline behavior from stored events

> Learn per-entity baselines from stored events on a schedule, publish them as lookup tables, and judge live streams with robust scores

This guide shows you how to learn what is normal for each entity from events that your data lake already stores, publish that knowledge as a lookup table, and judge a live stream against it. Use this pattern when the learning horizon spans days or weeks and should not live inside a streaming window.

The solution uses one opinionated execution boundary: ClickHouse reduces raw events to the same 15-minute buckets that the detector observes, while TQL computes median and MAD, owns the daily schedule, and publishes the result. This keeps the statistical policy in the pipeline without moving raw events out of the lake.

## Create the baseline context

Create the lookup-table context once before starting the learner or detector:

```tql
context_create_lookup_table "egress-baseline"
```

The context is the contract between the two pipelines. The learner updates one record per asset, and the detector reads that record without restarting when it changes.

## Learn the baseline on a schedule

This guide uses ClickHouse as the lake. Our [ClickHouse](../../integrations/clickhouse.md) integration keeps Network Activity queryable as `ocsf.Network_Activity`.

Run the learner daily. The SQL query reduces a week of Network Activity to one outbound byte sum per asset and 15-minute bucket. TQL then reduces those buckets to one robust baseline per asset:

```tql
every 1d {
  from_clickhouse uri="clickhouse://analytics.example.com:9440", sql="
    SELECT src_endpoint.ip AS asset,
           toStartOfFifteenMinutes(time) AS bucket,
           sum(traffic.bytes_out) AS bytes_out
    FROM ocsf.Network_Activity
    WHERE time > now() - INTERVAL 7 DAY
      AND src_endpoint.network_scope_id = 1
      AND dst_endpoint.network_scope_id = 2
    GROUP BY asset, bucket"
  summarize asset,
            typical=median(bytes_out),
            dispersion=mad(bytes_out),
            samples=count()
  // Do not judge an asset from thin history.
  where samples >= 100
  updated_at = now()
  context_update "egress-baseline", key=asset
}
```

The bucket size must match the detector window so that both pipelines measure the same quantity. [`median`](https://tenzir.com/docs/reference/functions/median.md) supplies the typical value, and [`mad`](https://tenzir.com/docs/reference/functions/mad.md) supplies a robust scale that resists outliers in the learning window. The `samples` guard keeps assets with insufficient history out of the context until enough windows have closed.

Because the learner queries retained events, its first run can use the full learning horizon for every asset already present in the lake. Those assets do not need to warm up inside the live stream.

## Judge live observations

Aggregate outbound traffic over the same 15-minute window, enrich each result with its stored baseline, and calculate a modified z-score. Branch immediately after enrichment so missing and stale baselines do not disappear silently:

```tql
subscribe "ocsf"
where class_uid == 4001 and activity_id == 6
where src_endpoint.network_scope_id == 1 and
      dst_endpoint.network_scope_id == 2
window size=15min, on=time, tolerance=1min, idle_timeout=5min {
  group src_endpoint.ip {
    summarize bytes_out=sum(traffic.bytes_out)
    asset = $group
    start = $window.start
    end = $window.end
  }
}
context_enrich "egress-baseline", key=asset, into=baseline
if baseline == null {
  baseline_status = "missing"
} else if now() - baseline.updated_at >= 2d {
  baseline_status = "stale"
} else {
  baseline_status = "ready"
  score = 0.6745 * (bytes_out - baseline.typical) / baseline.dispersion
  where score >= 3.5
}
```

The ready branch emits only observations whose distance from the median exceeds 3.5 MAD units after scaling. Route `baseline_status == "missing"` as low-risk novelty evidence, and route `baseline_status == "stale"` to operational monitoring instead of judging against old knowledge. Once a new asset gathers 100 buckets, the next learner run adds it to the context and the ready branch takes over.

Model scored candidates as OCSF Detection Findings with the evidence posture: stamp a `risk_score`, omit the alert flag, and let a [risk-accumulating combinator](create-multi-stage-detectors.md#accumulate-risk-per-entity) decide when several deviations warrant an alert. Our explanation of [alerting postures](../../explanations/detections.md#choose-the-alerting-posture) covers this division of labor.

## Verify relative scoring

Use two assets with different learned baselines to verify that the score is relative rather than absolute:

```tql
from {asset: 10.0.0.9, bytes_out: 4800000, baseline: {typical: 195000.0, dispersion: 10000.0}},
     {asset: 10.0.2.4, bytes_out: 58000000, baseline: {typical: 52000000.0, dispersion: 3000000.0}}
score = 0.6745 * (bytes_out - baseline.typical) / baseline.dispersion
where score >= 3.5
```

```tql
{
  asset: 10.0.0.9,
  bytes_out: 4800000,
  baseline: {
    typical: 195000.0,
    dispersion: 10000.0,
  },
  score: 310.60725,
}
```

The workstation’s 4.8 MB observation surfaces, while the backup server’s much larger 58 MB observation scores only 1.3 and stays quiet. A global threshold large enough to tolerate the server would miss the workstation.

## Adapt the baseline policy

Once the basic loop works, adapt the key and learning query to the behavior you need to model:

* **Seasonality.** One value per asset averages away daily rhythm. Include an hour band in the key in both pipelines, for example `f"{asset}|{time.hour()}"`.
* **Poisoning.** The learner absorbs whatever the horizon contains. Exclude periods that produced findings, and treat a baseline that suddenly widens as evidence of its own.
* **Execution placement.** This guide deliberately keeps the robust reduction in TQL. If bucket transfer dominates the workload, materialize bucket sums or the full baseline in the lake while preserving the lookup context as the detector-facing interface. Our discussion of [where computation and state should live](https://tenzir.com/blog/per-asset-baselines-for-detection-over-streaming-ocsf.md#choose-where-computation-and-state-live) develops that trade-off.

The guide on [detecting over time windows](detect-over-time-windows.md#compare-observations-with-a-rolling-baseline) covers the alternative where recent history remains inside the stream.

## See also

* [Detections](../../explanations/detections.md)
* [Enrichment](../../explanations/enrichment.md)
* [`median`](https://tenzir.com/docs/reference/functions/median.md)
* [`mad`](https://tenzir.com/docs/reference/functions/mad.md)
* [ClickHouse](../../integrations/clickhouse.md)
* [Detect over time windows](detect-over-time-windows.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
