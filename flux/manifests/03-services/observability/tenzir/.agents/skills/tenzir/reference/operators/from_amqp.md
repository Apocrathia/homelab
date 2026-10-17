---
title: "from_amqp"
canonical: https://tenzir.com/docs/reference/operators/from_amqp
source: https://tenzir.com/docs/reference/operators/from_amqp.md
section: "Docs"
---

# from_amqp

> Receives messages from an AMQP queue.

Receives messages from an AMQP queue.

```tql
from_amqp url:secret, [channel=int, exchange=str, routing_key=str, queue=str,
                       options=record, queue_arguments=record, passive=bool,
                       durable=bool, exclusive=bool, no_auto_delete=bool,
                       no_local=bool, ack=bool]
```

## Description

The `from_amqp` operator is an [AMQP](https://www.amqp.org/) 0-9-1 client that receives messages from a queue. It emits one event per AMQP message with the schema `tenzir.amqp` and a `message: blob` field containing the message body.

### `url: secret`

The URL of the AMQP server. The URL must have the following format:

```txt
amqp://[USERNAME[:PASSWORD]@]HOSTNAME[:PORT]/[VHOST]
```

The URL is required. Values in the URL override corresponding entries from `options`.

### `channel = int (optional)`

The channel number to use.

The value must fit into an unsigned 16-bit integer.

Defaults to `1`.

### `exchange = str (optional)`

The exchange to interact with.

Defaults to `"amq.direct"`.

### `routing_key = str (optional)`

The routing key to bind the queue to the exchange.

Defaults to the empty string.

### `queue = str (optional)`

The name of the queue to declare and bind.

Defaults to the empty string, which lets the broker generate a queue name, such as `"amq.gen-XNTLF0FwabIn9FFKKtQHzg"`.

### `options = record (optional)`

An option record for the AMQP connection. Values must be numbers, booleans, strings, or secrets.

Use `options` to configure the AMQP connection. Use `queue_arguments` to configure the queue declaration.

Available options are:

```yaml
hostname: 127.0.0.1
port: 5672
ssl: false
vhost: /
max_channels: 2047
frame_size: 131072
heartbeat: 0
sasl_method: plain
username: guest
password: guest
```

### `queue_arguments = record (optional)`

A record of AMQP field-table arguments to pass to the queue declaration.

Use this parameter for broker-specific queue settings, such as RabbitMQ quorum queues, queue length limits, message TTLs, single active consumers, and dead-lettering settings.

Values must be numbers, booleans, or strings. Nested records, lists, blobs, nulls, and secrets are not supported.

### `passive = bool (optional)`

If `true`, the broker replies with OK if a queue already exists with the same name and raises an error otherwise.

Defaults to `false`.

### `durable = bool (optional)`

If `true`, a newly created queue is durable and remains active when the broker restarts.

Defaults to `false`.

### `exclusive = bool (optional)`

If `true`, the queue is exclusive to the current connection and is deleted when the connection closes.

Defaults to `false`.

### `no_auto_delete = bool (optional)`

If `true`, the queue is not deleted when all consumers have finished using it.

Defaults to `false`.

### `no_local = bool (optional)`

If `true`, the broker doesn’t send messages to the connection that published them.

Defaults to `false`.

### `ack = bool (optional)`

If `true`, the broker expects acknowledgements for messages. If `false`, the broker assumes delivery will succeed and immediately dequeues the message.

Defaults to `false`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), `from_amqp` can attach several consumers to the same classic or quorum queue. The broker can distribute messages among these consumers.

The operator runs multiple instances only when all of these conditions hold:

* `queue` names a non-empty queue.
* `exclusive` and `passive` are `false`.
* `queue_arguments` explicitly sets `"x-queue-type"` to `"classic"` or `"quorum"`.

All other configurations stay on a single instance. In particular, a missing queue type isn’t sufficient because the broker can default to a stream queue. Stream consumers maintain independent offsets and would each receive the same messages.

Setting `"x-single-active-consumer": true` still permits multiple operator instances, but RabbitMQ delivers messages to only one of them at a time. This setting preserves delivery semantics but doesn’t improve throughput.

## Examples

### Receive messages from an AMQP queue

```tql
from_amqp "amqp://admin:pass@0.0.0.1:5672/vhost", queue="events"
```

### Parse JSON messages

```tql
from_amqp "amqp://admin:pass@0.0.0.1:5672/vhost", queue="events"
this = string(message).parse_json()
```

### Configure connection options

```tql
from_amqp "amqp://broker/vhost", options={
  username: "tenzir",
  password: secret("amqp-password"),
  heartbeat: 30,
}
```

### Declare a RabbitMQ quorum queue

```tql
from_amqp "amqp://broker/vhost",
          queue="events",
          durable=true,
          no_auto_delete=true,
          queue_arguments={
            "x-queue-type": "quorum",
            "x-quorum-initial-group-size": 1,
          }
```

## See Also

* [`to_amqp`](https://tenzir.com/docs/reference/operators/to_amqp.md)
* [Read from message brokers](../../guides/collect/read-from-message-brokers.md)
* [AMQP](../../integrations/amqp.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
