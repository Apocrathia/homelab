---
title: "write_all"
canonical: https://tenzir.com/docs/reference/operators/write_all
source: https://tenzir.com/docs/reference/operators/write_all.md
section: "Docs"
---

# write_all

> Concatenates one field from all input events into a byte stream.

Concatenates one field from all input events into a byte stream.

```tql
write_all field
```

## Description

The `write_all` operator takes one field selector and appends the field’s values in input order. It accepts fields of type `blob` and `string`.

For `blob` fields, `write_all` appends the bytes verbatim. For `string` fields, it appends the existing string bytes without adding separators or escaping.

The operator skips `null` values and events where the selected field is missing. It emits no bytes if all values are skipped.

## Examples

### Write strings without separators

```tql
from {data: "hello"}, {data: " "}, {data: "world"}
to_stdout {
  write_all data
}
```

```txt
hello world
```

### Copy a binary file

Use [`read_all`](https://tenzir.com/docs/reference/operators/read_all.md) with `binary=true` to read a file into a `blob` field, then write that field back as raw bytes.

```tql
from_file "/tmp/report.pdf" {
  read_all binary=true
}
to_file "/tmp/report-copy.pdf" {
  write_all data
}
```

### Write a nested field

```tql
from {payload: {data: b"foo"}}, {payload: {data: b"bar"}}
to_file "/tmp/payload.bin" {
  write_all payload.data
}
```

## See Also

* [`read_all`](https://tenzir.com/docs/reference/operators/read_all.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [`to_stdout`](https://tenzir.com/docs/reference/operators/to_stdout.md)
* [`write_chunks`](https://tenzir.com/docs/reference/operators/write_chunks.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
