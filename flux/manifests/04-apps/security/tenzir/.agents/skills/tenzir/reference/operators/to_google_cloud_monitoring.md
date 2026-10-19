---
title: "to_google_cloud_monitoring"
canonical: https://tenzir.com/docs/reference/operators/to_google_cloud_monitoring
source: https://tenzir.com/docs/reference/operators/to_google_cloud_monitoring.md
section: "Docs"
---

# to_google_cloud_monitoring

> Sends metric events to Google Cloud Monitoring.

Sends metric events to Google Cloud Monitoring.

```tql
to_google_cloud_monitoring [project=string, service_credentials=string,
    name=string, value=number, timestamp=time, start_timestamp=time,
    labels=record, type=string, help=string, unit=string, count=int,
    sum=number, bucket_counts=list<int>, explicit_bounds=list<number>,
    metric_prefix=string, resource_type=string, resource_labels=record,
    flush_interval=duration, max_pending_series=int, timeout=duration,
    max_retry_count=int]
```

## Description

The `to_google_cloud_monitoring` operator writes metric events as [user-defined metrics](https://cloud.google.com/monitoring/custom-metrics) to [Google Cloud Monitoring](https://cloud.google.com/monitoring) through the Cloud Monitoring API.

The operator accepts the same input shape as [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md), so you can send the output of `metrics shape="prometheus"` without reshaping it:

```tql
{
  metric: "http_requests_total",
  value: 42,
  timestamp: 2026-05-15T10:00:00Z,
  start_timestamp: 2026-05-15T09:00:00Z,
  labels: {
    method: "GET",
    status: 200,
  },
  type: "counter",
  help: "HTTP requests",
  unit: "1",
}
```

The metric type in Cloud Monitoring is `metric_prefix` followed by the metric name, for example `custom.googleapis.com/http_requests_total`.

### Metric kinds

The `type` field decides how the operator writes a metric:

| `type`                     | Metric kind  | Value type     |
| -------------------------- | ------------ | -------------- |
| `gauge`, `unknown`, `info` | `GAUGE`      | `DOUBLE`       |
| `counter`                  | `CUMULATIVE` | `DOUBLE`       |
| `histogram`                | `CUMULATIVE` | `DISTRIBUTION` |
| `gaugehistogram`           | `GAUGE`      | `DISTRIBUTION` |

Events without a `type` are gauges. The operator skips `summary` and `stateset` metrics with a warning.

Cumulative metrics require a `start_timestamp` before `timestamp`. Keep the start timestamp constant for a series until the counter resets, and pick a new start timestamp after the end of the previous point on reset. The operator skips cumulative events without a start timestamp with a warning.

### Histograms

Histograms use one event per histogram point in the layout of OpenTelemetry, which [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) produces:

```tql
{
  metric: "request_duration_seconds",
  type: "histogram",
  start_timestamp: 2026-05-15T09:00:00Z,
  timestamp: 2026-05-15T10:00:00Z,
  count: 10,
  sum: 25.0,
  explicit_bounds: [0.1, 0.5, 1.0],
  bucket_counts: [1, 3, 4, 2],
}
```

`explicit_bounds` holds `N ≥ 1` finite, strictly increasing bucket boundaries and `bucket_counts` holds the `N + 1` counts per bucket, from the bucket below the first boundary to the bucket above the last one. The counts must add up to `count`, which must not exceed the range of signed 64-bit integers, and a histogram has at most 200 buckets. The operator writes the mean as `sum / count`. Histograms without a `sum`, which OpenTelemetry allows, have no mean, so Cloud Monitoring reports their mean as `0`.

Note the following differences to the histograms in Prometheus and OpenTelemetry:

* Cloud Monitoring excludes the upper boundary from a bucket, while Prometheus and OpenTelemetry include it. The operator writes the boundaries unchanged.
* Cloud Monitoring distributions carry a sum of squared deviations, which the input doesn’t provide. The operator writes `0`, so the variance of these distributions isn’t meaningful.

The operator doesn’t combine Prometheus histograms that consist of separate `_bucket`, `_sum`, and `_count` series.

### Metric descriptors

The first time the operator sees a metric type, it fetches the metric descriptor from Cloud Monitoring. If the descriptor doesn’t exist yet, the operator creates it with the metric kind and value type from the table above, `help` as description, and `unit` as unit. Use [UCUM units](https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors#MetricDescriptor.FIELDS.unit) such as `s`, `By`, or `1`. If Cloud Monitoring rejects the description or unit, the operator creates the descriptor without them.

When the operator can’t fetch or create a descriptor, it skips the events of that metric with a warning and tries again after a minute.

If the descriptor exists, the operator writes values that match it and skips other events with a warning. For example, an `INT64` metric accepts only whole numbers, and a `CUMULATIVE` metric doesn’t accept gauges.

### Write rate and batching

Cloud Monitoring accepts one point per time series and request, and the end timestamps of two points of the same series must be at least 5 seconds apart. The operator therefore buffers the newest point per series and writes all buffered points every `flush_interval`, in requests of at most 200 series. Older points of a series within the same interval are dropped.

When a point ends less than 5 seconds after the last point that the operator wrote for its series, the operator drops it with a warning.

### Monitored resource

Every time series belongs to a [monitored resource](https://cloud.google.com/monitoring/custom-metrics/creating-metrics#which-resource) that identifies the writer. Set `resource_type` and `resource_labels` to choose the resource explicitly. Otherwise, the operator detects the Compute Engine instance it runs on through the metadata server and writes to a `gce_instance` resource. Outside of Compute Engine, you must set the resource.

Make sure that every writer uses a distinct resource, because Cloud Monitoring rejects points that two writers write to the same series. For nodes outside of Google Cloud, use the `generic_node` resource with a `node_id` per node.

### Error handling

The operator retries requests that fail with transport errors, HTTP `429`, or HTTP `5xx` responses. Authentication errors, missing permissions, and unknown projects stop the pipeline. When Cloud Monitoring rejects some points of a request, the operator reports the number of rejected points as a warning and continues.

### `project = string (optional)`

The ID of the Google Cloud project to write to.

Defaults to the `GOOGLE_CLOUD_PROJECT` environment variable, or to the project of the Compute Engine instance from the metadata server.

### `service_credentials = string (optional)`

JSON credentials of a Google Cloud service account.

The service account needs the `roles/monitoring.metricWriter` role, which grants creating time series and metric descriptors.

Defaults to [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials).

### `name = string (optional)`

Expression for the metric name.

Defaults to `metric`.

### `value = number (optional)`

Expression for the value of gauges and counters. The value must be finite.

Defaults to `value`.

### `timestamp = time (optional)`

Expression for the end of the interval of a point. Accepts a time or Unix milliseconds.

If the expression evaluates to `null`, Tenzir uses the processing time. Cloud Monitoring rejects points that end more than 25 hours in the past or more than 5 minutes in the future, so the operator skips them with a warning.

Defaults to `timestamp`.

### `start_timestamp = time (optional)`

Expression for the start of the interval of cumulative points. Accepts a time or Unix milliseconds.

Defaults to `start_timestamp`.

### `labels = record (optional)`

Expression for the metric labels.

Label values are converted to strings. Label keys consist of lowercase letters, digits, underscores, and dots, and start with a letter, so keys such as `service.name` stay unchanged. The operator lowercases other keys, replaces invalid characters with `_`, and prefixes keys that don’t start with a letter with `key_`. For example, `HTTP-Method` becomes `http_method`.

Cloud Monitoring requires every series of a metric to carry all labels of the metric. The operator therefore writes labels that an event lacks, or that are `null` or empty, as empty strings. A metric has at most 30 labels.

Defaults to `labels`.

### `type = string (optional)`

Expression for the metric type. See [metric kinds](to_google_cloud_monitoring.md#metric-kinds) for the supported values.

Defaults to `type`.

### `help = string (optional)`

Expression for the description of newly created metric descriptors.

Defaults to `help`.

### `unit = string (optional)`

Expression for the unit of newly created metric descriptors.

Defaults to `unit`.

### `count = int (optional)`

Expression for the number of observations in a histogram.

Defaults to `count`.

### `sum = number (optional)`

Expression for the sum of the observations in a histogram.

Defaults to `sum`.

### `bucket_counts = list<int> (optional)`

Expression for the number of observations per histogram bucket.

Defaults to `bucket_counts`.

### `explicit_bounds = list<number> (optional)`

Expression for the histogram bucket boundaries.

Defaults to `explicit_bounds`.

### `metric_prefix = string (optional)`

The prefix for the metric types.

Defaults to `custom.googleapis.com/`.

### `resource_type = string (optional)`

The type of the monitored resource, for example `generic_node`.

### `resource_labels = record (optional)`

The labels of the monitored resource. Requires `resource_type`.

### `flush_interval = duration (optional)`

How often to write the buffered points.

Values below `5s` cause dropped points for series that receive data continuously.

Defaults to `10s`.

### `max_pending_series = int (optional)`

Maximum number of buffered series. When the buffer is full, the operator writes the buffered points before it accepts more input.

Defaults to `10000`.

### `timeout = duration (optional)`

Timeout for each HTTP request.

Defaults to `30s`.

### `max_retry_count = int (optional)`

Maximum number of retries per request.

Defaults to `5`.

## Examples

### Send node metrics

```tql
metrics live=true, shape="prometheus"
to_google_cloud_monitoring project="my-project",
  metric_prefix="custom.googleapis.com/tenzir/"
```

### Send metrics from outside of Google Cloud

```tql
metrics live=true, shape="prometheus"
to_google_cloud_monitoring project="my-project",
  service_credentials=secret("gcp-monitoring-credentials"),
  resource_type="generic_node",
  resource_labels={
    location: "europe-west1",
    namespace: "tenzir",
    node_id: "node-1",
  }
```

### Forward OpenTelemetry histograms

Cloud Monitoring doesn’t accept delta metrics for user-defined metrics, so forward only histograms with cumulative aggregation temporality:

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

## See Also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [`to_prometheus`](https://tenzir.com/docs/reference/operators/to_prometheus.md)
* [Collect metrics](../../guides/observability/collect-metrics.md)
* [Google Cloud Monitoring](../../integrations/google/cloud-monitoring.md)
