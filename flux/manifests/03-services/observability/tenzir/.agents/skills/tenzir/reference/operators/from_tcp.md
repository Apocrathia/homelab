---
title: "from_tcp"
canonical: https://tenzir.com/docs/reference/operators/from_tcp
source: https://tenzir.com/docs/reference/operators/from_tcp.md
section: "Docs"
---

# from_tcp

> Connects to a remote TCP or TLS endpoint and receives events.

Connects to a remote TCP or TLS endpoint and receives events.

```tql
from_tcp endpoint:string, [tls=record, { … }]
```

## Description

Connects to the specified TCP endpoint as a client and reads bytes from the connection, running them through an optional nested pipeline.

If the connection fails, the operator retries with exponential backoff.

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

### `{ … } (optional)`

The pipeline to run for the TCP connection. Use this to parse the incoming byte stream into events, for instance `{ read_json }`.

Inside the pipeline, the `$peer` variable is available as a record with the following fields:

| Field  | Type    | Description                        |
| ------ | ------- | ---------------------------------- |
| `ip`   | `ip`    | The IP address of the remote peer  |
| `port` | `int64` | The port number of the remote peer |

## Examples

### Connect to a remote server and read JSON

```tql
from_tcp "example.org:4000" {
  read_json
}
```

### Connect with TLS

```tql
from_tcp "example.org:4443", tls={} {
  read_json
}
```

### Connect with TLS and a custom CA certificate

```tql
from_tcp "example.org:4443", tls={cacert: "ca.pem"} {
  read_json
}
```

## See Also

* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [`serve_tcp`](https://tenzir.com/docs/reference/operators/serve_tcp.md)
* [`from_unix_socket`](https://tenzir.com/docs/reference/operators/from_unix_socket.md)
* [TCP](../../integrations/tcp.md)
