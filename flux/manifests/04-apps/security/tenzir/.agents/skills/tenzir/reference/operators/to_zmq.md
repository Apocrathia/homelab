---
title: "to_zmq"
canonical: https://tenzir.com/docs/reference/operators/to_zmq
source: https://tenzir.com/docs/reference/operators/to_zmq.md
section: "Docs"
---

# to_zmq

> Connects to a remote ZeroMQ subscriber endpoint and sends events.

Connects to a remote ZeroMQ subscriber endpoint and sends events.

```tql
to_zmq endpoint:string, encoding=string, [prefix=string, monitor=bool]
```

## Description

Connects to the specified ZeroMQ endpoint as a `PUB` socket and publishes one message per input event.

The operator serializes each event with the selected `encoding` and optionally prepends a prefix to the serialized bytes before publishing the message. This prefix is intended for PUB/SUB-style routing and matches the `prefix` option of [`from_zmq`](https://tenzir.com/docs/reference/operators/from_zmq.md) and [`accept_zmq`](https://tenzir.com/docs/reference/operators/accept_zmq.md).

If the connection fails, the operator retries with exponential backoff.

### `endpoint: string`

The remote endpoint to connect to. This is typically a ZeroMQ endpoint such as `tcp://host:port`, `ipc://path`, or `inproc://name`.

### `encoding = string`

The encoding to use when serializing input events into ZeroMQ message payloads.

Use the same format names that you would otherwise select with a `write_*` operator, for example `json`, `ndjson`, `csv`, or `yaml`.

### `prefix = string (optional)`

An expression that evaluates to the prefix to prepend to each published message.

Unlike the read-side `prefix`, this expression may depend on event fields. The operator evaluates it for every input event.

### `monitor = bool (optional)`

Waits for the first peer connection before publishing messages on TCP transports.

## Examples

### Connect and publish JSON

```tql
export
to_zmq "tcp://collector.example.com:5555", encoding="json"
```

### Publish per-event prefixes

```tql
export
to_zmq "tcp://collector.example.com:5555", encoding="ndjson", prefix=f"{source}/"
```

## See Also

* [`serve_zmq`](https://tenzir.com/docs/reference/operators/serve_zmq.md)
* [`from_zmq`](https://tenzir.com/docs/reference/operators/from_zmq.md)
* [`accept_zmq`](https://tenzir.com/docs/reference/operators/accept_zmq.md)
* [`to_zmq`](https://tenzir.com/docs/reference/operators/to_zmq.md)
* [ZeroMQ](../../integrations/zeromq.md)
