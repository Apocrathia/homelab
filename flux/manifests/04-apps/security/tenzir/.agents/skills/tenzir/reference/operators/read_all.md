---
title: "read_all"
canonical: https://tenzir.com/docs/reference/operators/read_all
source: https://tenzir.com/docs/reference/operators/read_all.md
section: "Docs"
---

# read_all

> Parses an incoming bytes stream into a single event.

Parses an incoming bytes stream into a single event.

```tql
read_all [binary=bool]
```

## Description

The `read_all` operator takes its input bytes and produces a single event that contains everything. This is useful if the entire stream is needed for further processing at once.

The resulting events have a single field called `data`.

### `binary = bool (optional)`

Treat the input as binary data instead of UTF-8 text. When enabled, invalid UTF-8 sequences will not cause warnings, and the resulting `data` field will be of type `blob` instead of `string`.

## Examples

### Read an entire text file into a single event

```tql
from_file "data.txt" {
  read_all
}
```

```tql
{data: "<file contents>"}
```

### Read an entire binary file into a single event

```tql
from_file "data.bin" {
  read_all binary=true
}
```

```tql
{data: b"<file contents>"}
```

## See Also

* [`read_chunks`](https://tenzir.com/docs/reference/operators/read_chunks.md)
* [`read_delimited`](https://tenzir.com/docs/reference/operators/read_delimited.md)
* [`read_delimited_regex`](https://tenzir.com/docs/reference/operators/read_delimited_regex.md)
* [`read_lines`](https://tenzir.com/docs/reference/operators/read_lines.md)
