---
title: "to_prometheus"
canonical: https://tenzir.com/docs/reference/operators/to_prometheus
source: https://tenzir.com/docs/reference/operators/to_prometheus.md
section: "Docs"
---

# to_prometheus

> Sends metric events to a Prometheus Remote Write receiver.

Sends metric events to a Prometheus Remote Write receiver.

```tql
to_prometheus url:string, [protobuf_message=string, name=string,
    value=number, timestamp=time, labels=record, type=string, help=string,
    unit=string, family=string, start_timestamp=time, headers=record,
    tls=record, timeout=duration, connection_timeout=duration,
    max_retry_count=int, retry_delay=duration, flush_interval=duration,
    max_samples_per_request=int, max_uncompressed_bytes=int,
    sanitize_names=bool]
```

## Description

The `to_prometheus` operator converts incoming events to Prometheus Remote Write requests and sends them with HTTP `POST`. The request body is a protobuf message compressed with Snappy.

By default, the operator sends Remote Write v1 requests with the `prometheus.WriteRequest` protobuf message. Set `protobuf_message="io.prometheus.write.v2.Request"` to send Remote Write v2 requests.

The default input shape is:

```tql
{
  metric: "http_requests_total",
  value: 42,
  timestamp: 2026-05-15T10:00:00Z,
  labels: {
    method: "GET",
    status: 200,
  },
  type: "counter",
  help: "HTTP requests",
  unit: "requests",
  family: "http_requests",
  start_timestamp: 2026-05-15T09:00:00Z,
}
```

You can use expression options such as `name=metric_name` or `labels={tenant: tenant_id}` to send existing schemas without reshaping them first.

The [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md) operator can produce the default input shape with `shape="prometheus"`.

The operator writes the metric-name expression as the reserved Prometheus `__name__` label. The expression defaults to the `metric` field. Providing `labels.__name__` is invalid. Samples with the same label set are batched into one time series per request, and samples in each time series are sorted by timestamp before serialization.

### `url: string`

The Remote Write endpoint URL.

The URL is resolved as a [secret](../../explanations/secrets.md), so you can pass a secret name to avoid hardcoding sensitive URLs.

### `protobuf_message = string (optional)`

The protobuf message to send.

Supported values:

* `prometheus.WriteRequest`
* `io.prometheus.write.v2.Request`

Defaults to `prometheus.WriteRequest`.

### `name = string (optional)`

Expression for the metric name.

Defaults to `metric`.

### `value = number (optional)`

Expression for the sample value.

Defaults to `value`.

### `timestamp = time (optional)`

Expression for the sample timestamp.

If the expression evaluates to `null` or the field is absent, Tenzir uses the processing time.

Defaults to `timestamp`.

### `labels = record (optional)`

Expression for metric labels.

The record field names become label names. Label values are converted to strings. Empty label names, empty label values, duplicate label names, and `__name__` labels are invalid.

Defaults to `labels`. If the field is absent, the operator sends no custom labels.

### `type = string (optional)`

Expression for Prometheus metric metadata type.

Supported values are `counter`, `gauge`, `histogram`, `gaugehistogram`, `summary`, `info`, and `stateset`.

Defaults to `type`.

### `help = string (optional)`

Expression for the metric help text.

Defaults to `help`.

### `unit = string (optional)`

Expression for the metric unit.

Defaults to `unit`.

### `family = string (optional)`

Expression for the metric family name.

If the expression evaluates to `null` or the field is absent, Tenzir uses the final metric name.

Defaults to `family`.

### `start_timestamp = time (optional)`

Expression for the Remote Write v2 sample start timestamp.

This field is only sent for Remote Write v2 requests. Defaults to `start_timestamp`.

### `headers = record (optional)`

Additional HTTP headers. Header values are resolved as [secrets](../../explanations/secrets.md).

The following Remote Write headers are reserved and cannot be overridden:

* `Content-Encoding`
* `Content-Length`
* `Content-Type`
* `User-Agent`
* `X-Prometheus-Remote-Write-Version`

### `timeout = duration (optional)`

Timeout for each HTTP request.

Defaults to `30s`.

### `connection_timeout = duration (optional)`

Timeout for establishing the connection.

Defaults to `5s`.

### `max_retry_count = int (optional)`

Maximum number of retry attempts per request.

A request is retried on transient transport failures and HTTP `429` and `5xx` responses.

Defaults to `5`.

### `retry_delay = duration (optional)`

Base duration between retry attempts.

Tenzir uses exponential backoff starting at `retry_delay` and capping at `16 * retry_delay`. A `Retry-After` response header overrides this delay.

Defaults to `1s`.

### `tls = record (optional)`

TLS configuration. Provide an empty record (`tls={}`) to enable TLS with defaults or set fields to customize it.

```tql
{
  skip_peer_verification: bool, // skip certificate verification.
  cacert: string,               // CA bundle to verify peers.
  certfile: string,             // client certificate to present.
  keyfile: string,              // private key for the client certificate.
  min_version: string,          // minimum TLS version (`"1.0"`, `"1.1"`, `"1.2"`, "1.3"`).
  ciphers: string,              // OpenSSL cipher list string.
  client_ca: string,            // CA to validate client certificates.
  require_client_cert: bool,    // require clients to present a certificate.
}
```

The `client_ca` and `require_client_cert` options are only valid for operators that accept incoming client connections.

Any value not specified in the record will either be picked up from the configuration or if not configured will not be used by the operator.

See the [Node TLS Setup guide](../../guides/node-setup/configure-tls.md) for more details.

### `flush_interval = duration (optional)`

Maximum amount of time to buffer samples before sending a request.

Defaults to `1s`.

### `max_samples_per_request = int (optional)`

Maximum number of samples to include in one request.

Defaults to `2000`.

### `max_uncompressed_bytes = int (optional)`

Maximum uncompressed protobuf request size in bytes.

Defaults to `4Mi`.

### `sanitize_names = bool (optional)`

Whether to replace invalid metric-name and label-name characters with `_`.

Defaults to `true`.

## Examples

### Send canonical metric events

```tql
from {
  metric: "http_requests_total",
  value: 42,
  timestamp: 2026-05-15T10:00:00Z,
  labels: {
    method: "GET",
    status: 200,
  },
}
to_prometheus "https://prometheus.example/api/v1/write"
```

### Map an existing schema

```tql
from {
  metric_name: "cpu_usage",
  usage: 0.82,
  host: "sensor-a",
}
to_prometheus "https://prometheus.example/api/v1/write",
  name=metric_name,
  value=usage,
  labels={host: host}
```

### Send Remote Write v2 metadata

```tql
from {
  metric: "requests_total",
  value: 100,
  type: "counter",
  help: "Total requests",
  unit: "requests",
}
to_prometheus "https://prometheus.example/api/v1/write",
  protobuf_message="io.prometheus.write.v2.Request"
```

## Limitations

The operator currently supports scalar samples only. It does not support native histograms, exemplars, persistent queues, automatic protocol negotiation, OAuth, SigV4, or round-robin DNS behavior.

## See Also

* [`metrics`](https://tenzir.com/docs/reference/operators/metrics.md)
* [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md)
* [Collect metrics](../../guides/observability/collect-metrics.md)
* [Prometheus](../../integrations/prometheus.md)
