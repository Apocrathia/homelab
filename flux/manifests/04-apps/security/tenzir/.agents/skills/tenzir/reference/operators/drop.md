---
title: "drop"
canonical: https://tenzir.com/docs/reference/operators/drop
source: https://tenzir.com/docs/reference/operators/drop.md
section: "Docs"
---

# drop

> Removes fields from the event.

Removes fields from the event.

```tql
drop field...
```

## Description

Removes the given fields from the events. Issues a warning if a field is not present.

## Examples

### Drop fields from the input

```tql
from {
  src: 192.168.0.4,
  dst: 192.168.0.31,
  role: "admin",
  info: {
    id: "cR32kdMD9",
    msg: 8411,
  },
}
drop role, info.id
```

```tql
{
  src: 192.168.0.4,
  dst: 192.168.0.31,
  info: {
    msg: 8411,
  },
}
```

## See Also

* [`select`](https://tenzir.com/docs/reference/operators/select.md)
* [`where`](https://tenzir.com/docs/reference/operators/where.md)
* [Filter and select data](../../guides/optimize/filter-and-select-data.md)
* [Learn idiomatic TQL](../../tutorials/learn-idiomatic-tql.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
