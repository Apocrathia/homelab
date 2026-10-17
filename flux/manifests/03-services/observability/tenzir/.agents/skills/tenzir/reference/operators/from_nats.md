---
title: "from_nats"
canonical: https://tenzir.com/docs/reference/operators/from_nats
source: https://tenzir.com/docs/reference/operators/from_nats.md
section: "Docs"
---

# from_nats

> Consumes messages from a NATS JetStream subject.

Consumes messages from a NATS JetStream subject.

```tql
from_nats subject:string, [url=secret, durable=string, count=int, tls=record,
          auth=record, metadata_field=field, _batch_size=int,
          _queue_capacity=int, _batch_timeout=duration]
```

## Description

The `from_nats` operator consumes messages from a NATS JetStream subject. The operator produces one event per NATS message with a `message` field of type `blob`. It acknowledges messages after the events were pushed downstream.

The NATS server must have a JetStream stream that captures the subject you consume from. The operator uses the default URL `nats://localhost:4222` unless you provide `url` or configure `plugins.nats.url`.

Durable consumers must use explicit acknowledgments. If `from_nats` creates the durable consumer, it configures the consumer with explicit acknowledgments. If a durable consumer already exists with a different acknowledgment policy, the operator exits with an error.

### `subject: string`

The NATS subject to consume from.

### `url = secret (optional)`

The NATS server URL.

If the URL has no scheme, Tenzir uses `nats://` by default or `tls://` when TLS is enabled. Use `nats://`, `tls://`, `ws://`, or `wss://` to select a specific transport.

### `durable = string (optional)`

The durable consumer name to use for the JetStream subscription.

### `count = int (optional)`

Exit successfully after consuming `count` messages.

### `metadata_field = field (optional)`

The field that receives a record with NATS message metadata.

The metadata record contains these fields:

| Field               | Type     | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `subject`           | `string` | The message subject.                                |
| `reply`             | `string` | The reply subject, or `null` when absent.           |
| `headers`           | `record` | NATS headers as `list<string>` values.              |
| `stream`            | `string` | The JetStream stream name, or `null` when absent.   |
| `consumer`          | `string` | The JetStream consumer name, or `null` when absent. |
| `stream_sequence`   | `uint64` | The stream sequence number.                         |
| `consumer_sequence` | `uint64` | The consumer sequence number.                       |
| `num_delivered`     | `uint64` | The message delivery count.                         |
| `num_pending`       | `uint64` | The number of pending messages for the consumer.    |
| `timestamp`         | `time`   | The JetStream message timestamp.                    |

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

NATS uses the standard Tenzir `tls` record. The nats.c library doesn’t expose a minimum TLS version setting, so `tls.min_version` is accepted for record compatibility but ignored with a warning.

### `_batch_size = int (optional)`

The maximum number of messages to emit in one batch.

### `_queue_capacity = int (optional)`

The maximum number of received messages to queue before applying backpressure.

### `_batch_timeout = duration (optional)`

The maximum time to wait before emitting a partial batch.

## Examples

### Consume messages

```tql
from_nats "alerts"
```

### Consume JSON messages

```tql
from_nats "alerts"
this = string(message).parse_json()
```

### Collect NATS metadata

```tql
from_nats "alerts", durable="tenzir-alerts", metadata_field=nats
parsed = string(message).parse_json()
nats_subject = nats.subject
nats_stream_sequence = nats.stream_sequence
```

### Connect with token authentication and TLS

```tql
from_nats "alerts",
  url="tls://nats.example.com:4222",
  auth={token: secret("NATS_TOKEN")},
  tls={}
this = string(message).parse_json()
```

## See Also

* [`to_nats`](https://tenzir.com/docs/reference/operators/to_nats.md)
* [Read from message brokers](../../guides/collect/read-from-message-brokers.md)
* [NATS](../../integrations/nats.md)
