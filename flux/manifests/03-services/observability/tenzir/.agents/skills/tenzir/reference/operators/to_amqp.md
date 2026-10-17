---
title: "to_amqp"
canonical: https://tenzir.com/docs/reference/operators/to_amqp
source: https://tenzir.com/docs/reference/operators/to_amqp.md
section: "Docs"
---

# to_amqp

> Sends messages to an AMQP exchange.

Sends messages to an AMQP exchange.

```tql
to_amqp url:secret, [message=str|blob, channel=int, exchange=str,
                     routing_key=str, options=record, mandatory=bool,
                     immediate=bool]
```

## Description

The `to_amqp` operator is an [AMQP](https://www.amqp.org/) 0-9-1 client that sends messages to an exchange. It sends one AMQP message per input event.

By default, `to_amqp` serializes each input event as NDJSON. Use the `message` option to send a specific string or blob expression instead. If the expression evaluates to `null` or another type, the operator skips that event and emits a warning.

### `url: secret`

The URL of the AMQP server. The URL must have the following format:

```txt
amqp://[USERNAME[:PASSWORD]@]HOSTNAME[:PORT]/[VHOST]
```

The URL is required. Values in the URL override corresponding entries from `options`.

### `message = str | blob (optional)`

The expression that produces the AMQP message body.

Defaults to `this.print_ndjson()`.

### `channel = int (optional)`

The channel number to use.

The value must fit into an unsigned 16-bit integer.

Defaults to `1`.

### `exchange = str (optional)`

The exchange to publish to.

Defaults to `"amq.direct"`.

### `routing_key = str (optional)`

The routing key to publish messages with.

Defaults to the empty string.

### `options = record (optional)`

An option record for the AMQP connection. Values must be numbers, booleans, strings, or secrets.

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

### `mandatory = bool (optional)`

If `true`, the broker returns an unroutable message instead of silently dropping it.

Defaults to `false`.

### `immediate = bool (optional)`

If `true`, the broker returns an undeliverable message when no consumer can receive it immediately.

Defaults to `false`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_amqp` opens its own connection and channel.

The `routing_key` routes messages to queues but does not pin them to an instance: two events with the same routing key may be published by different instances and therefore arrive in their queue out of the pipeline’s event order. Keep parallelism disabled if a consumer relies on the order within one queue.

## Examples

### Send events to an AMQP exchange

```tql
plugins
to_amqp "amqp://admin:pass@0.0.0.1:5672/vhost"
```

### Send a specific field as the message body

```tql
from {payload: "hello"}
to_amqp "amqp://admin:pass@0.0.0.1:5672/vhost", message=payload
```

### Configure connection options

```tql
from {payload: "hello"}
to_amqp "amqp://broker/vhost", message=payload, options={
  username: "tenzir",
  password: secret("amqp-password"),
  heartbeat: 30,
}
```

## See Also

* [`from_amqp`](https://tenzir.com/docs/reference/operators/from_amqp.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [AMQP](../../integrations/amqp.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
