---
title: "accept_otlp"
canonical: https://tenzir.com/docs/reference/operators/accept_otlp
source: https://tenzir.com/docs/reference/operators/accept_otlp.md
section: "Docs"
---

# accept_otlp

> Receives OpenTelemetry logs, metrics, and traces over OTLP/HTTP or OTLP/gRPC.

Receives OpenTelemetry logs, metrics, and traces over OTLP/HTTP or OTLP/gRPC.

```tql
accept_otlp endpoint:string,
  [transport=string,
   signals=list<string>,
   schema=string,
   max_message_size=int,
   max_concurrent_requests=int,
   include_metadata=list<string>,
   tls=record]
```

## Description

The `accept_otlp` operator starts an OTLP receiver and emits one event for each log record, span, or metric data point. It accepts OTLP/HTTP requests as JSON or binary Protobuf and OTLP/gRPC unary requests as Protobuf. Both transports support gzip, TLS, and mTLS.

A successful response means that Tenzir accepted every item in the request into the pipeline. It doesn’t guarantee that a downstream destination stored the data durably. The receiver rejects a complete request if any item is invalid.

Limitations

For OTLP/HTTP, plaintext endpoints require HTTP/1.1. The receiver does not support profiles, binary gRPC metadata, partial-success responses, or the gRPC health and reflection services.

### `endpoint: string`

The endpoint on which to accept requests. Use `0.0.0.0` to accept connections on all interfaces.

```tql
accept_otlp "0.0.0.0:4318"
accept_otlp "http://0.0.0.0:4318"
accept_otlp "https://0.0.0.0:4318", tls={…}
```

The scheme and the `tls` option must agree. An `https://` endpoint requires TLS, and an `http://` endpoint rejects an enabled TLS configuration. Without a scheme, the `tls` option determines whether the receiver uses TLS.

### `transport = string (optional)`

The OTLP transport:

* `"http"` accepts OTLP/HTTP on the configured endpoint. This is the default.
* `"grpc"` accepts OTLP/gRPC on the configured endpoint.

One invocation owns one listener. Run separate pipelines on the conventional ports when you need both transports:

```tql
accept_otlp "0.0.0.0:4318", transport="http"
```

```tql
accept_otlp "0.0.0.0:4317", transport="grpc"
```

### `signals = list<string> (optional)`

The signals to accept. Choose any combination of `"logs"`, `"metrics"`, and `"traces"`. The receiver enables all three signals by default.

```tql
accept_otlp "0.0.0.0:4318", signals=["logs", "traces"]
```

A request for a disabled signal receives HTTP `404 Not Found` over OTLP/HTTP. The corresponding gRPC service remains unregistered and returns `UNIMPLEMENTED`.

### `schema = string (optional)`

Controls the output schema for OTLP attributes.

* `"list"` preserves attributes as a list of key-value records. This is the default. It preserves order and keeps the event schema stable when producers add attribute keys.
* `"record"` creates one record field for each attribute key. This mode is more convenient for direct field access, but different key and value combinations can produce different schemas.

List mode emits attributes in this form:

```tql
attributes: [
  {
    key: "service.name",
    value: {
      kind: "string",
      string_value: "frontend",
      bool_value: null,
      int_value: null,
      double_value: null,
      bytes_value: null,
      json_value: null,
    },
  },
]
```

Record mode keeps attribute keys literal. It doesn’t interpret dots as nested record paths:

```tql
accept_otlp "0.0.0.0:4318", schema="record"
where resource.attributes["service.name"] == "frontend"
```

If an attribute key occurs more than once in record mode, the receiver keeps the last value and emits a warning. Use list mode to preserve every value and their order.

### `max_message_size = int (optional)`

The maximum uncompressed size of an OTLP message. The default is `64MiB`.

The receiver enforces the limit while decompressing gzip requests, so an oversized compressed message receives HTTP `413 Content Too Large` without materializing the complete decompressed body.

### `max_concurrent_requests = int (optional)`

The maximum number of active requests. The default is `128`. To bound memory, the receiver further limits concurrency to a `512MiB` request budget while always allowing one request. HTTP reserves three times `max_message_size` per request for the decoded body, a queued chunk, and a chunk held by a blocked handler. OTLP/gRPC reserves `max_message_size` per request and also applies a receive-time memory quota of at least `512MiB` while buffering and deserializing requests. An excess request receives HTTP `503 Service Unavailable` or gRPC `UNAVAILABLE`.

### `include_metadata = list<string> (optional)`

Copies selected HTTP headers or textual gRPC metadata into `receiver.metadata`. Names are matched case-insensitively and emitted in lowercase. The list preserves duplicate names. Binary gRPC metadata keys ending in `-bin` can’t be selected and are otherwise ignored.

```tql
accept_otlp "0.0.0.0:4318", include_metadata=["x-tenant-id"]
```

Metadata isn’t included by default because it can contain credentials.

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

OTLP/gRPC supports server certificates and mTLS. It rejects `tls.min_version`, `tls.ciphers`, and password-protected private keys because the supported gRPC API can’t configure them per listener.

## HTTP protocol

Send `POST` requests to the endpoint for the matching signal:

| Path          | Signal  |
| ------------- | ------- |
| `/v1/logs`    | Logs    |
| `/v1/metrics` | Metrics |
| `/v1/traces`  | Traces  |

Set `Content-Type` to `application/x-protobuf` for binary Protobuf or `application/json` for OTLP JSON. Set `Content-Encoding: gzip` for a gzip-compressed body.

The receiver returns these status codes:

| Condition                                             | Status                       |
| ----------------------------------------------------- | ---------------------------- |
| The complete message was accepted                     | `200 OK`                     |
| The OTLP message is invalid                           | `400 Bad Request`            |
| The path is unknown or the signal is disabled         | `404 Not Found`              |
| The method isn’t `POST`                               | `405 Method Not Allowed`     |
| The content type or encoding isn’t supported          | `415 Unsupported Media Type` |
| The uncompressed message exceeds the configured limit | `413 Content Too Large`      |
| The receiver or pipeline is unavailable               | `503 Service Unavailable`    |

A successful response uses the same encoding as the request and contains the signal-specific empty export response.

## gRPC protocol

Set `transport="grpc"` and listen on the conventional OTLP/gRPC port `4317`. The receiver registers the standard unary `Export` service for each enabled signal. gRPC Core handles HTTP/2 framing, gzip, deadlines, and cancellation.

| Condition                                             | Status               |
| ----------------------------------------------------- | -------------------- |
| The complete message was accepted                     | `OK`                 |
| The OTLP message or metadata is invalid               | `INVALID_ARGUMENT`   |
| The uncompressed message exceeds the configured limit | `RESOURCE_EXHAUSTED` |
| The receiver or pipeline is unavailable               | `UNAVAILABLE`        |
| The client cancels the request                        | `CANCELLED`          |
| The request deadline expires                          | `DEADLINE_EXCEEDED`  |
| The signal is disabled                                | `UNIMPLEMENTED`      |
| An internal receiver failure occurs                   | `INTERNAL`           |

An empty request succeeds. Successful responses leave `partial_success` unset. The size-limit response doesn’t include `RetryInfo`, so conforming exporters treat it as non-retryable.

## Output schemas

Every event starts with resource, instrumentation scope, and receiver context:

```tql
{
  resource: {
    attributes: [],
    dropped_attributes_count: 0,
    entity_refs: [],
    schema_url: null,
  },
  scope: {
    name: "example",
    version: null,
    attributes: [],
    dropped_attributes_count: 0,
    schema_url: null,
  },
  receiver: {
    transport: "http",
    peer_ip: 192.0.2.1,
    metadata: [],
  },
}
```

The receiver emits these schemas:

| Schema                              | Event granularity                              |
| ----------------------------------- | ---------------------------------------------- |
| `otel.log`                          | One event per log record                       |
| `otel.span`                         | One event per span                             |
| `otel.metric.gauge`                 | One event per gauge data point                 |
| `otel.metric.sum`                   | One event per sum data point                   |
| `otel.metric.histogram`             | One event per histogram data point             |
| `otel.metric.exponential_histogram` | One event per exponential histogram data point |
| `otel.metric.summary`               | One event per summary data point               |

The `resource.entity_refs` list preserves OTLP entity associations. Each entry contains the entity type, schema URL, identifying attribute keys, and descriptive attribute keys.

### Logs

`otel.log` contains timestamps, severity, body, attributes, flags, trace and span IDs, and the event name. The recursive OTLP `AnyValue` body uses the same tagged representation as list attributes. Primitive values populate their typed field. Arrays and key-value lists populate `json_value` with their canonical OTLP JSON representation.

### Spans

`otel.span` preserves trace, span, and parent IDs, trace state, name, kind, timestamps, attributes, events, links, status, dropped counts, and flags. Known span kinds and status codes have both a numeric ID and a lowercase name.

### Metrics

Metric events contain the metric name, description, unit, metadata attributes, data-point attributes and timestamps, value or distribution fields, flags, and exemplars. Sum and histogram events also contain their aggregation temporality.

A request that contains multiple metric kinds produces one batch for each output schema. Events preserve their order within each request. The receiver does not define an order between concurrent requests.

## Migrate from Fluent Bit

Replace a Fluent Bit OpenTelemetry input:

```tql
from_fluent_bit "opentelemetry"
```

with a native OTLP receiver:

```tql
accept_otlp "0.0.0.0:4318"
```

Configure OpenTelemetry SDKs or the OpenTelemetry Collector to use `http/protobuf` or `http/json` on port `4318`, or `grpc` on port `4317`. The gRPC transport supports encrypted and plaintext endpoints.

## See also

* [Get data from the network](../../guides/collect/get-data-from-the-network.md)
* [HTTP](../../integrations/http.md)
