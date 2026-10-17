---
title: "to_tcp"
canonical: https://tenzir.com/docs/reference/operators/to_tcp
source: https://tenzir.com/docs/reference/operators/to_tcp.md
section: "Docs"
---

# to_tcp

> Connects to a remote TCP or TLS endpoint and sends events.

Connects to a remote TCP or TLS endpoint and sends events.

```tql
to_tcp endpoint:string, [tls=record, max_retry_count=int] { … }
```

## Description

Connects to the specified TCP endpoint as a client and writes serialized events to the connection. Input events are run through a nested pipeline that must produce bytes (e.g., `{ write_json }`).

If the connection fails, the operator reconnects automatically with exponential backoff. By default it retries forever; use `max_retry_count` to bound the number of reconnect attempts.

### `endpoint: string`

The remote endpoint to connect to. Must be of the form `[tcp://]<hostname>:<port>`.

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

### `max_retry_count = int (optional)`

Maximum number of reconnect attempts after a failed connection. After this many consecutive failures, the operator emits an error and stops.

Defaults to retrying forever.

### `{ … }`

The pipeline to serialize input events into bytes. Must produce bytes as output, for instance `{ write_json }` or `{ write_csv }`.

## Examples

### Send JSON to a remote server

```tql
export
to_tcp "collector.example.com:5044" { write_json }
```

### Send with TLS

```tql
export
to_tcp "collector.example.com:5044", tls={} { write_json }
```

## See Also

* [`from_tcp`](https://tenzir.com/docs/reference/operators/from_tcp.md)
* [`serve_tcp`](https://tenzir.com/docs/reference/operators/serve_tcp.md)
* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [`to_unix_socket`](https://tenzir.com/docs/reference/operators/to_unix_socket.md)
* [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md)
* [TCP](../../integrations/tcp.md)
