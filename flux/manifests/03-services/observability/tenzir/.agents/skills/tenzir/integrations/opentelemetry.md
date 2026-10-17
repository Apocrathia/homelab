---
title: "OpenTelemetry integration"
description: "Receive OpenTelemetry logs, metrics, and traces over OTLP/HTTP or OTLP/gRPC."
canonical: https://tenzir.com/integrations/opentelemetry
source: https://tenzir.com/integrations/opentelemetry.md
section: "Integrations"
---

# OpenTelemetry integration

> Receive OpenTelemetry logs, metrics, and traces over OTLP/HTTP or OTLP/gRPC.

[OpenTelemetry](https://opentelemetry.io/) is a vendor-neutral framework for generating, collecting, and exporting logs, metrics, and traces. Applications and collectors exchange these signals through the OpenTelemetry Protocol (OTLP).

Tenzir receives OTLP/HTTP and OTLP/gRPC directly with [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md). The operator validates requests and produces the same typed event schemas for both transports.

## Choose an ingestion path

Use the receiver that provides the transport your exporters require:

| Requirement                                | Tenzir integration                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| OTLP/HTTP over HTTP/1.1                    | Native [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) receiver on port 4318 |
| OTLP/HTTP over HTTP/2 with TLS             | Native [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) receiver on port 4318 |
| OTLP/gRPC over HTTP/2, with or without TLS | Native [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) receiver on port 4317 |
| JSON or binary Protobuf over HTTP          | Native [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) receiver              |

The native receiver also supports gzip, TLS and mTLS, bounded request sizes, concurrency limits, and selected HTTP or gRPC metadata.

## Receive OTLP

Listen on the standard OTLP/HTTP port:

```tql
accept_otlp "0.0.0.0:4318"
```

The receiver accepts `POST` requests on the standard signal paths:

| Path          | Signal  | Output schema   |
| ------------- | ------- | --------------- |
| `/v1/logs`    | Logs    | `otel.log`      |
| `/v1/traces`  | Traces  | `otel.span`     |
| `/v1/metrics` | Metrics | `otel.metric.*` |

It accepts `application/x-protobuf` and `application/json`. Configure an OpenTelemetry SDK to use OTLP/HTTP and point its base endpoint at Tenzir:

```sh
export OTEL_EXPORTER_OTLP_ENDPOINT=http://tenzir.example:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Most SDK exporters append `/v1/logs`, `/v1/metrics`, or `/v1/traces` to the base endpoint. Consult your SDK documentation when it expects a signal-specific endpoint instead.

For OTLP/gRPC, start a separate listener and select the gRPC protocol:

```tql
accept_otlp "0.0.0.0:4317", transport="grpc"
```

```sh
export OTEL_EXPORTER_OTLP_ENDPOINT=http://tenzir.example:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

## Export from an OpenTelemetry Collector

Configure an `otlp` exporter when an OpenTelemetry Collector processes or aggregates telemetry before Tenzir:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:


exporters:
  otlp/tenzir:
    endpoint: tenzir.example:4317
    tls:
      ca_file: /etc/otelcol/certs/tenzir-ca.pem


service:
  pipelines:
    logs:
      receivers: [otlp]
      exporters: [otlp/tenzir]
    metrics:
      receivers: [otlp]
      exporters: [otlp/tenzir]
    traces:
      receivers: [otlp]
      exporters: [otlp/tenzir]
```

Keep TLS enabled

The exporter verifies the receiver certificate against the configured CA. Omit the `tls` configuration when a public CA signed the certificate. Set `tls.insecure: true` only for local testing with a cleartext receiver.

Add the processors and queue settings that your deployment requires. Use an `otlphttp` exporter pointing at port `4318` when you prefer OTLP/HTTP.

## Choose an attribute representation

By default, the receiver keeps attributes as ordered lists of key-value records. Tagged values preserve duplicate keys and OTLP value kinds, and the event schema stays stable when a producer adds an attribute.

Set `schema="record"` when you control the attribute vocabulary and prefer direct field access:

```tql
accept_otlp "0.0.0.0:4318", schema="record"
where resource.attributes["service.name"] == "frontend"
```

Record mode cannot represent duplicate keys, and changing attribute keys or value kinds creates different event schemas.

## Route telemetry to destinations

The native schemas preserve OTLP context and value kinds so that pipelines can filter, transform, enrich, and route telemetry before a destination consumes it. An HTTP `200 OK` or gRPC `OK` response means that the pipeline accepted the complete request; it does not mean that a downstream destination persisted the events durably. Configure retries and buffering in the SDK or Collector when delivery must survive receiver or destination outages.

## Secure the receiver

Enable TLS by using an `https://` endpoint and supplying the server certificate. This example also requires exporters to present a client certificate:

```tql
accept_otlp "https://0.0.0.0:4318",
  max_message_size=16Mi,
  max_concurrent_requests=256,
  tls={
    certfile: "server-cert.pem",
    keyfile: "server-key.pem",
    client_ca: "client-ca.pem",
    require_client_cert: true,
  }
```

The message-size limit applies after gzip decompression. Requests over the concurrency limit receive HTTP `503 Service Unavailable` or gRPC `UNAVAILABLE`, which lets conforming exporters retry them.

Use `include_metadata` only for non-secret routing metadata:

```tql
accept_otlp "0.0.0.0:4318", include_metadata=["x-tenant-id"]
```

The receiver excludes HTTP headers and gRPC metadata by default because they can contain credentials. Put it behind an authenticating proxy when you need bearer-token or OIDC authentication.

See [Configure TLS](../guides/node-setup/configure-tls.md) for the complete TLS configuration.

## See Also

* [Get data from the network](../guides/collect/get-data-from-the-network.md)
* [ClickHouse](clickhouse.md)
* [Fluent Bit](fluent-bit.md)
* [HTTP](http.md)
