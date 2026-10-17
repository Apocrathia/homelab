---
title: "serve_tcp"
canonical: https://tenzir.com/docs/reference/operators/serve_tcp
source: https://tenzir.com/docs/reference/operators/serve_tcp.md
section: "Docs"
---

# serve_tcp

> Listens for incoming TCP connections and sends events to all connected clients.

Listens for incoming TCP connections and sends events to all connected clients.

```tql
serve_tcp endpoint:string, [max_connections=int, tls=record] { … }
```

## Description

The `serve_tcp` operator starts a TCP server on the given endpoint and broadcasts pipeline output to all connected clients. Input events are run through a nested pipeline that must produce bytes (e.g., `{ write_json }`).

Clients that connect receive the serialized output as a continuous byte stream. Clients that disconnect or fail to keep up are dropped with a warning.

### `endpoint: string`

The endpoint to listen on. Must be of the form `[tcp://]<hostname>:<port>`. Use `0.0.0.0` as the host to accept connections on all interfaces.

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

### `max_connections = int (optional)`

The maximum number of simultaneous client connections to accept. Additional connections beyond this limit are rejected.

Defaults to `128`.

### `{ … }`

The pipeline to serialize input events into bytes. Must produce bytes as output, for instance `{ write_json }` or `{ write_csv }`.

## Examples

### Serve JSON to all connected TCP clients

```tql
export
serve_tcp "0.0.0.0:8090" { write_json }
```

Connect with:

```bash
nc localhost 8090
```

### Serve with TLS

```tql
export
serve_tcp "0.0.0.0:8443", tls={certfile: "cert.pem", keyfile: "key.pem"} {
  write_json
}
```

## See Also

* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [`from_tcp`](https://tenzir.com/docs/reference/operators/from_tcp.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [TCP](../../integrations/tcp.md)
