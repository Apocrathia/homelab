---
title: "Collect metrics"
canonical: https://tenzir.com/docs/guides/observability/collect-metrics
source: https://tenzir.com/docs/guides/observability/collect-metrics.md
section: "Docs"
---

# Collect metrics

> Tenzir keeps track of metrics about node resource usage, pipeline state, and runtime performance.

Tenzir keeps track of metrics about node resource usage, pipeline state, and runtime performance.

Metrics are stored as internal events in the node’s storage engine, allowing you to work with metrics just like regular data. Use the [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md) input operator to access the metrics. The operator documentation lists [all available metrics](../../reference/operators/metrics.md#schemas) in detail.

The `metrics` operator provides a *copy* of existing metrics. You can use it multiple time to reference the same metrics feed.

## Write metrics to a file

Export metrics continuously to a file via `metrics --live`:

```tql
metrics live=true
to_file "metrics.json", append=true {
  write_ndjson
}
```

This attaches to incoming metrics feed, renders them as NDJSON, and then writes the output to a file. Without the `live` option, the `metrics` operator returns the snapshot of all historical metrics.

## Summarize metrics

You can [filter and select](../optimize/filter-and-select-data.md) metrics like ordinary data. For example, write aggregations over metrics to compute runtime statistics suitable for reporting or dashboarding:

```tql
metrics "operator_profile"
summarize cpu=sum(cpu), pipeline_id
sort -cpu
```

The previous example sums the per-second CPU usage of each operator, grouped by pipeline ID, to surface the most CPU-intensive pipelines.

## Inspect pipeline throughput

Use `tenzir.metrics.pipeline` events to compare the number of events and bytes that enter and leave each pipeline:

```tql
metrics "pipeline"
summarize ingress_events=sum(ingress.events), ingress_bytes=sum(ingress.bytes), egress_events=sum(egress.events), egress_bytes=sum(egress.bytes), pipeline_id
sort -egress_events
```

The `events` fields count records that passed through the pipeline during the metric period. The `bytes` fields approximate the amount of data transferred.

## Send metrics to Prometheus

Use `shape="prometheus"` with [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md) and [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md) to send live metrics to a Prometheus-compatible Remote Write receiver:

```tql
metrics live=true, shape="prometheus"
to_prometheus "https://prometheus.example/api/v1/write"
```

The [Prometheus](../../integrations/prometheus.md) integration page covers endpoint setup, authentication headers, and additional examples.

## Send metrics to Google Cloud Monitoring

The same shape works with [`to_google_cloud_monitoring`](https://tenzir.com/docs/reference/operators/to_google_cloud_monitoring.md), which writes the metrics as user-defined metrics to Google Cloud Monitoring:

```tql
metrics live=true, shape="prometheus"
to_google_cloud_monitoring project="my-project",
  metric_prefix="custom.googleapis.com/tenzir/"
```

On Compute Engine, the operator identifies each node by its instance. Elsewhere, set `resource_type` and `resource_labels` to give every node its own monitored resource. The [Google Cloud Monitoring](../../integrations/google/cloud-monitoring.md) integration page covers permissions, credentials, and additional examples.
