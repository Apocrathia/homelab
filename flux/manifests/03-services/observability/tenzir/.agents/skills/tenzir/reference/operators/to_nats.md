---
title: "to_nats"
canonical: https://tenzir.com/docs/reference/operators/to_nats
source: https://tenzir.com/docs/reference/operators/to_nats.md
section: "Docs"
---

# to_nats

> Publishes messages to a NATS JetStream subject.

Publishes messages to a NATS JetStream subject.

```tql
to_nats subject:string, [message=blob|string, headers=record, url=secret,
        tls=record, auth=record, _max_pending=int]
```

## Description

The `to_nats` operator publishes one NATS JetStream message per input event. The NATS server must have a JetStream stream that captures the target subject.

The operator uses the default URL `nats://localhost:4222` unless you provide `url` or configure `plugins.nats.url`.

### `subject: string`

The NATS subject to publish to.

### `message = blob|string (optional)`

An expression that evaluates to the message payload for each row.

Defaults to `this.print_ndjson()` when not specified.

### `headers = record (optional)`

An expression that evaluates to a record of NATS headers for each row. Header values must be strings or lists of strings.

### `url = secret (optional)`

The NATS server URL.

If the URL has no scheme, Tenzir uses `nats://` by default or `tls://` when TLS is enabled. Use `nats://`, `tls://`, `ws://`, or `wss://` to select a specific transport.

### `auth = record (optional)`

Authentication settings for the NATS connection. Each value can be a string or a secret.

Supported authentication records are:

* `{token: secret("NATS_TOKEN")}` for token authentication.
* `{user: "alice", password: secret("NATS_PASSWORD")}` for user/password authentication.
* `{credentials: "/path/to/user.creds"}` for NATS credentials files.
* `{credentials: "/path/to/user.creds", seed: "/path/to/user.nk"}` for credentials files with a separate seed file.
* `{credentials_memory: secret("NATS_CREDS")}` for credentials content stored in a secret.

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

NATS uses the standard Tenzir `tls` record. The nats.c library does not expose a minimum TLS version setting, so `tls.min_version` is accepted for record compatibility but ignored with a warning.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_nats` publishes through its own connection. Messages from different instances interleave on the subject, so subscribers may observe events out of the pipeline’s event order. Keep parallelism disabled if a consumer of the subject relies on that order.

## Examples

### Publish a JSON event

```tql
from {
  severity: "high",
  alert_type: "suspicious-login",
}
to_nats "alerts"
```

### Publish headers

```tql
from {
  message: "hello",
  headers: {
    source: "tenzir",
    tags: ["demo", "nats"],
  },
}
to_nats "alerts", message=message, headers=headers
```

### Connect with token authentication and TLS

```tql
subscribe "alerts"
to_nats "alerts",
  url="tls://nats.example.com:4222",
  auth={token: secret("NATS_TOKEN")},
  tls={}
```

## See Also

* [`from_nats`](https://tenzir.com/docs/reference/operators/from_nats.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [NATS](../../integrations/nats.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
