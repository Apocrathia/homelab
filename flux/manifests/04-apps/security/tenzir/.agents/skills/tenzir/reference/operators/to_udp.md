---
title: "to_udp"
canonical: https://tenzir.com/docs/reference/operators/to_udp
source: https://tenzir.com/docs/reference/operators/to_udp.md
section: "Docs"
---

# to_udp

> Sends one UDP datagram per input event.

Sends one UDP datagram per input event.

```tql
to_udp endpoint:string, [message=any]
```

## Description

Sends one UDP datagram per input event to a fixed remote UDP endpoint.

`to_udp` consumes events directly. It does not accept byte streams from `write_*` operators; use the `message` expression to choose the string, blob, or record that should become the datagram payload.

### `endpoint: string`

The address of the remote endpoint. Must be of the format `host:port`. The optional `udp://` prefix is accepted but not required.

### `message = any (optional)`

An expression that is evaluated once per input event. The result must produce one of the following types:

* `string` values are sent as UTF-8 bytes.
* `blob` values are sent verbatim.
* `record` values are serialized as compact JSON.
* `null` values are skipped with a warning.

All other result types are ignored with a warning.

If you omit `message`, the operator sends the whole event as compact JSON.

## Examples

Send a field as a UDP datagram:

```tql
from {message: "hello"}
to_udp "127.0.0.1:514", message=message
```

Send the full event as compact JSON:

```tql
from {service: "dns", status: "ok"}
to_udp "127.0.0.1:514"
```

## See Also

* [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md)
* [UDP](../../integrations/udp.md)
