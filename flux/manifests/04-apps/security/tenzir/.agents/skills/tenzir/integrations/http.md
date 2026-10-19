---
title: "HTTP integration"
description: "Transfer and receive data between clients and servers using a request-response protocol."
canonical: https://tenzir.com/integrations/http
source: https://tenzir.com/integrations/http.md
section: "Integrations"
---

# HTTP integration

> Transfer and receive data between clients and servers using a request-response protocol.

[HTTP](https://en.wikipedia.org/wiki/HTTP) is the foundation of data exchange on the web. Tenzir provides operators for all sides of an HTTP conversation: fetching data from APIs, sending events to webhooks, streaming pipeline output to clients, and accepting incoming requests.

## Fetching data from APIs

When retrieving data from an API or website, you prepare your HTTP request and get back the HTTP response body as your pipeline data:

HTTP from

Use [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md) to issue a one-shot HTTP request and stream the response body chunks into its parser sub-pipeline as they arrive. The operator automatically infers the response format from the URL extension or `Content-Type` header.

See the [Fetch via HTTP and APIs](../guides/collect/fetch-via-http-and-apis.md) guide for practical examples covering authentication, pagination, error handling, and data enrichment.

## Sending data to webhooks and APIs

Use [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md) to send events to a webhook or API endpoint as a single HTTP request per operator invocation. A printer sub-pipeline turns the input events into the request body bytes, which Tenzir streams directly into the outgoing request. This is useful for pushing alerts to webhooks, forwarding events to SIEMs, or sending periodic batches to external APIs.

HTTP to

## Streaming data to HTTP clients

Use [`serve_http`](https://tenzir.com/docs/reference/operators/serve_http.md) to start an HTTP server that streams the bytes produced by a nested pipeline to connected clients. For example, use [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) when you want NDJSON over HTTP or [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md) when you want plain text.

See the [Expose data as a server](../guides/route/expose-data-as-server.md) guide for practical examples covering serialization, connection limits, and TLS.

## Accepting incoming requests

Use [`accept_http`](https://tenzir.com/docs/reference/operators/accept_http.md) to spin up an HTTP server that turns incoming requests into pipeline events. This is useful for receiving webhooks, building custom API endpoints, or ingesting data pushed by external systems.

For OpenTelemetry logs, metrics, and traces, use the protocol-aware [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md) receiver instead of parsing OTLP requests with [`accept_http`](https://tenzir.com/docs/reference/operators/accept_http.md). See [Get data from the network](../guides/collect/get-data-from-the-network.md) for OpenTelemetry SDK and Collector configuration.

## Proxies

Outbound HTTP requests from [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md) and [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md) use the node-level HTTP proxy settings. See [Configuration](../explanations/configuration.md#outbound-proxy-configuration) to configure proxy URLs, bypass rules, and environment variable fallbacks.

## SSL/TLS

All HTTP operators support TLS. Pass `tls={}` to enable TLS with defaults, or provide a record with specific options like `certfile` and `keyfile`.
