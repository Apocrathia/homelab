---
title: "internal_memory_size"
canonical: https://tenzir.com/docs/reference/functions/internal_memory_size
source: https://tenzir.com/docs/reference/functions/internal_memory_size.md
section: "Docs"
---

# internal_memory_size

> Estimates the internal memory size of a value in bytes.

Estimates the internal memory size of a value in bytes.

```tql
internal_memory_size(x:any) -> int
```

## Description

The `internal_memory_size` function returns an approximate number of bytes that the value `x` occupies in Tenzir’s internal columnar representation.

Unstable estimate

The exact accounting rules are not stable. The returned size is an implementation detail and may change.

The estimate includes non-null primitive values, strings, blobs, records, and lists. Null values don’t contribute to the result.

## Examples

### Estimate the size of an event

```tql
from {
  src_ip: 192.168.1.10,
  msg: "allowed",
  ports: [22, 443],
}
size = internal_memory_size(this)
```

```tql
{
  src_ip: 192.168.1.10,
  msg: "allowed",
  ports: [22, 443],
  size: 39,
}
```

### Measure data flow and forward a summary

Subscribe to a topic, aggregate over a time window, and ship the result to an external system:

```tql
subscribe "firewall-events"
summarize start=min(time), end=max(time), size=sum(internal_memory_size(this)),
          options={emit: 15min, mode: "reset"}
to_amqp "amqp://user:pass@localhost:5672/"
```

## See Also

* [`type_id`](https://tenzir.com/docs/reference/functions/type_id.md)
* [`type_of`](https://tenzir.com/docs/reference/functions/type_of.md)
