---
title: "serve_http"
canonical: https://tenzir.com/docs/reference/operators/serve_http
source: https://tenzir.com/docs/reference/operators/serve_http.md
section: "Docs"
---

# serve_http

> Starts an HTTP server and streams bytes produced by a nested pipeline to connected clients.

Starts an HTTP server and streams bytes produced by a nested pipeline to connected clients.

```tql
serve_http endpoint:string, [max_connections=int, tls=record] { … }
```

## Description

The `serve_http` operator starts an HTTP server and broadcasts the bytes from a nested pipeline to all connected clients. Input events flow through the nested pipeline, which must produce bytes such as NDJSON, JSON, or plain text.

Clients connect with a `GET` request and receive a continuous HTTP response body. Each client only receives bytes produced after it connects. The operator does not buffer output for future clients.

Use the nested pipeline to choose the wire format. For example, [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) emits `application/x-ndjson`, and [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md) emits `text/plain`. If the nested pipeline does not set a content type, `serve_http` falls back to `application/octet-stream`.

Slow clients may be disconnected when they cannot keep up with the producer. When the input pipeline finishes, the server closes all active responses and stops accepting new connections.

### `endpoint: string`

The endpoint to listen on. Use `host:port`, `[host]:port`, `http://host:port`, or `https://host:port`. Use `0.0.0.0` to accept connections on all interfaces.

### `max_connections = int (optional)`

The maximum number of simultaneous client connections to accept. Additional connections wait until a slot becomes available.

Defaults to `128`.

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

### `{ … }`

The nested pipeline that serializes input events into bytes. It must produce bytes as output, for example `{ write_ndjson }`, `{ write_json }`, or `{ write_lines }`.

## Examples

### Stream NDJSON over HTTP

```tql
export
serve_http "0.0.0.0:8080" {
  write_ndjson
}
```

Connect with `curl`:

```bash
curl http://localhost:8080/
```

### Stream plain text lines

```tql
export
serve_http "0.0.0.0:8080" {
  write_lines
}
```

### Serve over HTTPS

```tql
export
serve_http "0.0.0.0:8443",
  tls={
    certfile: "/path/to/cert.pem",
    keyfile: "/path/to/key.pem",
  } {
  write_ndjson
}
```

## See Also

* [`accept_http`](https://tenzir.com/docs/reference/operators/accept_http.md)
* [`serve_tcp`](https://tenzir.com/docs/reference/operators/serve_tcp.md)
* [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md)
* [Expose data as a server](../../guides/route/expose-data-as-server.md)
* [HTTP](../../integrations/http.md)
