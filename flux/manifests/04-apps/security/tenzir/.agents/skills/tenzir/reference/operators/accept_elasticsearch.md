---
title: "accept_elasticsearch"
canonical: https://tenzir.com/docs/reference/operators/accept_elasticsearch
source: https://tenzir.com/docs/reference/operators/accept_elasticsearch.md
section: "Docs"
---

# accept_elasticsearch

> Accepts incoming Elasticsearch-compatible Bulk API requests and forwards them as events.

Accepts incoming Elasticsearch-compatible Bulk API requests and forwards them as events.

```tql
accept_elasticsearch [url:string, keep_actions=bool, max_request_size=int,
               tls=record]
```

## Description

The `accept_elasticsearch` operator starts an HTTP server that accepts Elasticsearch-compatible bulk ingestion requests on `/_bulk` and `/{index}/_bulk`. OpenSearch clients can use the same endpoint.

You can also use [`accept_opensearch`](https://tenzir.com/docs/reference/operators/accept_opensearch.md) as an alias.

For each bulk request, the operator buffers the request body in memory, up to `max_request_size`, optionally decompresses it based on the HTTP `Content-Encoding` header, parses the NDJSON payload, and emits the resulting records as events.

By default, the operator drops Bulk API action objects such as `{"create": ...}` and emits only the document records. To keep the action objects, set `keep_actions=true`.

The operator also responds to `GET /` with a minimal Elasticsearch-compatible info response so that basic health checks and client probes succeed.

### `url: string (optional)`

The endpoint to listen on.

Use the form `host:port`, `[host]:port`, `http://host:port`, or `https://host:port`.

Defaults to `"0.0.0.0:9200"`.

### `keep_actions = bool (optional)`

Whether to keep Bulk API action objects such as `{"create": ...}`.

Defaults to `false`.

### `max_request_size = int (optional)`

The maximum size of an incoming request to accept.

Requests that exceed this limit are rejected with HTTP `413 Content Too Large`.

Defaults to `10MiB`.

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

## Examples

### Listen on port 8080

```tql
accept_elasticsearch "0.0.0.0:8080"
```

### Keep action objects in the output

```tql
accept_elasticsearch keep_actions=true
```

### Accept HTTPS requests with TLS

```tql
accept_elasticsearch "0.0.0.0:8443",
                tls={
                  certfile: "/path/to/cert.pem",
                  keyfile: "/path/to/key.pem",
                }
```

## See Also

* [`to_elasticsearch`](https://tenzir.com/docs/reference/operators/to_elasticsearch.md)
* [`accept_opensearch`](https://tenzir.com/docs/reference/operators/accept_opensearch.md)
* [Elasticsearch](../../integrations/elasticsearch.md)
* [OpenSearch](../../integrations/opensearch.md)
