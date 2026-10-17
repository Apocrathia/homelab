---
title: "Google Cloud Monitoring integration"
description: "Send node metrics, gauges, counters, and histograms to Google Cloud Monitoring as user-defined metrics."
canonical: https://tenzir.com/integrations/google/cloud-monitoring
source: https://tenzir.com/integrations/google/cloud-monitoring.md
section: "Integrations"
---

# Google Cloud Monitoring integration

> Send node metrics, gauges, counters, and histograms to Google Cloud Monitoring as user-defined metrics.

[Google Cloud Monitoring](https://cloud.google.com/monitoring) collects metrics from Google Cloud, applications, and hosts for dashboards and alerting. Use the [`to_google_cloud_monitoring`](https://tenzir.com/docs/reference/operators/to_google_cloud_monitoring.md) operator to write metric events as [user-defined metrics](https://cloud.google.com/monitoring/custom-metrics) through the Cloud Monitoring API, without a Prometheus Remote Write receiver or an OpenTelemetry Collector in between.

The operator accepts the same metric events as [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md), so the output of [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md) with `shape="prometheus"` works without reshaping. It writes gauges, counters, and histograms in the layout that [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) produces.

## Prerequisites

1. Enable the Cloud Monitoring API in the Google Cloud project that receives the metrics.
2. Grant the identity of the Tenzir node the **Monitoring Metric Writer** role (`roles/monitoring.metricWriter`). It allows writing time series and creating the metric descriptors for new metrics.
3. Provide credentials. On Google Cloud, the operator uses [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials), such as the service account of a Compute Engine instance. Elsewhere, store the JSON key of a service account as a [secret](../../explanations/secrets.md) and pass it with `service_credentials`.

## Identify writers

Cloud Monitoring stores every time series under a [monitored resource](https://cloud.google.com/monitoring/custom-metrics/creating-metrics#which-resource) that identifies its writer. On Compute Engine, the operator detects the instance through the metadata server and writes to a `gce_instance` resource.

Elsewhere, set `resource_type` and `resource_labels`, for example with the `generic_node` resource. Give every node its own `node_id`: when two writers share a resource, they write to the same series and Cloud Monitoring rejects their points.

## Examples

### Export Tenzir node metrics from Compute Engine

Send live node metrics and group them under a common prefix, such as `custom.googleapis.com/tenzir/`:

```tql
metrics live=true, shape="prometheus"
to_google_cloud_monitoring project="my-project",
  metric_prefix="custom.googleapis.com/tenzir/"
```

### Export metrics from outside of Google Cloud

Authenticate with a service account key and describe the node as a `generic_node` resource:

```tql
metrics live=true, shape="prometheus"
to_google_cloud_monitoring project="my-project",
  service_credentials=secret("gcp-monitoring-credentials"),
  metric_prefix="custom.googleapis.com/tenzir/",
  resource_type="generic_node",
  resource_labels={
    location: "europe-west1",
    namespace: "tenzir",
    node_id: "node-1",
  }
```

### Send counters

Cumulative metrics need a start timestamp that stays the same until the counter resets:

```tql
from {
  metric: "requests_total",
  type: "counter",
  value: 1250,
  start_timestamp: now() - 1h,
  timestamp: now(),
  labels: {service: "api"},
}
to_google_cloud_monitoring project="my-project",
  resource_type="generic_node",
  resource_labels={location: "global", namespace: "tenzir", node_id: "node-1"}
```

### Forward OpenTelemetry histograms

Receive OTLP metrics and write cumulative histograms as distribution metrics:

```tql
accept_otlp "0.0.0.0:4317", signals=["metrics"], schema="record"
where @name == "otel.metric.histogram"
where aggregation_temporality == "cumulative"
to_google_cloud_monitoring project="my-project",
  name=metric.name,
  help=metric.description,
  unit=metric.unit,
  timestamp=time,
  start_timestamp=start_time,
  labels=attributes,
  type="histogram"
```

## Limitations

* Cloud Monitoring accepts one point per series every 5 seconds. The operator writes the newest point per series every `flush_interval`, which defaults to 10 seconds, and drops older points of the same interval.
* Cloud Monitoring doesn’t accept delta metrics for user-defined metrics, and the operator skips summaries and state sets.
* The operator doesn’t combine Prometheus histograms that consist of separate `_bucket`, `_sum`, and `_count` series.

## See Also

* [`to_google_cloud_monitoring`](https://tenzir.com/docs/reference/operators/to_google_cloud_monitoring.md)
* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [Collect metrics](../../guides/observability/collect-metrics.md)
* [Prometheus](../prometheus.md)
