---
title: "write_chunks"
canonical: https://tenzir.com/docs/reference/operators/write_chunks
source: https://tenzir.com/docs/reference/operators/write_chunks.md
section: "Docs"
---

# write_chunks

> Converts each input event into a separate byte chunk.

Converts each input event into a separate byte chunk.

```tql
write_chunks [field]
```

## Description

The `write_chunks` operator reads a field from each input event and emits it as a separate byte chunk. The field must be of type `blob`.

Unlike [`write_all`](https://tenzir.com/docs/reference/operators/write_all.md), which buffers all input and produces a single concatenated chunk at the end, `write_chunks` emits one chunk per event as data arrives.

This is the inverse of [`read_chunks`](https://tenzir.com/docs/reference/operators/read_chunks.md).

### `field = field (optional)`

The field to extract from each event. Defaults to `data`.

## Examples

### Write blob events to a file

```tql
from {data: b"hello"}, {data: b" "}, {data: b"world"}
to_file "output.bin" {
  write_chunks
}
```

### Specify a custom field

```tql
from {payload: b"hello"}, {payload: b"world"}
to_file "output.bin" {
  write_chunks payload
}
```

### Round-trip with read\_chunks

```tql
from_file "input.bin" {
  read_chunks
}
to_file "output.bin" {
  write_chunks
}
```

## See Also

* [`read_chunks`](https://tenzir.com/docs/reference/operators/read_chunks.md)
* [`write_all`](https://tenzir.com/docs/reference/operators/write_all.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
