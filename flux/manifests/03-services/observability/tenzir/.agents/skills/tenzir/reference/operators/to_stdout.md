---
title: "to_stdout"
canonical: https://tenzir.com/docs/reference/operators/to_stdout
source: https://tenzir.com/docs/reference/operators/to_stdout.md
section: "Docs"
---

# to_stdout

> Writes events to standard output.

Writes events to standard output.

```tql
to_stdout
```

## Description

The `to_stdout` operator writes events to standard output. Without a nested pipeline, `to_stdout` prints TQL by default. This is useful when using the `tenzir` executable as part of a shell script or command chain.

### `{ … }`

An optional pipeline to transform the input before writing it to standard output. The pipeline receives the input of `to_stdout` and must produce bytes.

Use a writer such as `write_ndjson`, `write_json`, or `write_tql` when the input is events.

Omit the pipeline to print events as TQL.

## Examples

### Write events as NDJSON

```tql
from {x: 1}, {x: 2}
to_stdout {
  write_ndjson
}
```

```json
{"x":1}
{"x":2}
```

### Write events as TQL

```tql
from {x: "Hello World"}
to_stdout
```

```tql
{x: "Hello World"}
```

## See Also

* [`from_stdin`](https://tenzir.com/docs/reference/operators/from_stdin.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
