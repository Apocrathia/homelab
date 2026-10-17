---
title: "from_zmq"
canonical: https://tenzir.com/docs/reference/operators/from_zmq
source: https://tenzir.com/docs/reference/operators/from_zmq.md
section: "Docs"
---

# from_zmq

> Connects to a remote ZeroMQ publisher and receives events.

Connects to a remote ZeroMQ publisher and receives events.

```tql
from_zmq endpoint:string, [prefix=string, keep_prefix=bool, { … }]
```

## Description

Connects to the specified ZeroMQ endpoint as a `SUB` socket and receives messages that match the configured subscription prefix.

Tenzir documents these operators for PUB/SUB-style use. ZeroMQ itself does not have a first-class notion of a topic. Instead, the `prefix` option performs a raw prefix match on the incoming message bytes, using ZeroMQ subscription filtering at the socket.

When `keep_prefix=false`, the operator strips the matched prefix from the message before running the nested pipeline. This lets you combine prefix-based routing at the transport layer with regular `read_*` operators inside TQL.

If the connection fails, the operator retries with exponential backoff.

### `endpoint: string`

The remote endpoint to connect to. This is typically a ZeroMQ endpoint such as `tcp://host:port`, `ipc://path`, or `inproc://name`.

### `prefix = string (optional)`

A constant subscription prefix to install on the `SUB` socket.

The expression must evaluate to a string before the operator starts receiving messages. It cannot depend on event fields.

Defaults to the empty string, which subscribes to all messages.

### `keep_prefix = bool (optional)`

Whether to keep the matched prefix in the bytes that are passed to the nested pipeline.

Defaults to `false`.

### `{ … } (optional)`

The pipeline to run for incoming message payloads. It receives bytes and must produce events, for example `{ read_json }` or `{ read_syslog }`.

If you omit the nested pipeline, the operator emits one event per message with a single field `message` containing the message payload as a `blob`.

## Examples

### Connect to a publisher and parse JSON

```tql
from_zmq "tcp://collector.example.com:5555" {
  read_json
}
```

### Subscribe to a prefixed stream

```tql
from_zmq "tcp://collector.example.com:5555", prefix="alerts/" {
  read_ndjson
}
```

### Keep the matched prefix

```tql
from_zmq "tcp://collector.example.com:5555", prefix="syslog ", keep_prefix=true {
  read_syslog
}
```

## See Also

* [`accept_zmq`](https://tenzir.com/docs/reference/operators/accept_zmq.md)
* [`to_zmq`](https://tenzir.com/docs/reference/operators/to_zmq.md)
* [`serve_zmq`](https://tenzir.com/docs/reference/operators/serve_zmq.md)
* [`from_zmq`](https://tenzir.com/docs/reference/operators/from_zmq.md)
* [ZeroMQ](../../integrations/zeromq.md)
