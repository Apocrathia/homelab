---
title: "read_chunks"
canonical: https://tenzir.com/docs/reference/operators/read_chunks
source: https://tenzir.com/docs/reference/operators/read_chunks.md
section: "Docs"
---

# read_chunks

> Parses binary data into events with a single data field, in a streaming fasion.

Parses binary data into events with a single `data` field, in a streaming fasion.

```tql
read_chunks
```

## Description

The `read_chunks` operator turns each incoming byte chunk into a single event with a field called `data` of type `blob`. Unlike [`read_all`](https://tenzir.com/docs/reference/operators/read_all.md), which buffers the entire input and produces one event, `read_chunks` emits events as data arrives.

This is useful for piping binary data out `from_` operators, that can only emit events.

## Examples

### Read a file as blob events

```tql
from_file "data.bin" {
  read_chunks
}
```

```tql
{data: b"<chunk contents>"}
```

### Round-trip with write\_chunks

```tql
from_file "input.bin" {
  read_chunks
}
to_file "output.bin" {
  write_chunks
}
```

## See Also

* [`read_all`](https://tenzir.com/docs/reference/operators/read_all.md)
* [`read_delimited`](https://tenzir.com/docs/reference/operators/read_delimited.md)
* [`write_chunks`](https://tenzir.com/docs/reference/operators/write_chunks.md)
