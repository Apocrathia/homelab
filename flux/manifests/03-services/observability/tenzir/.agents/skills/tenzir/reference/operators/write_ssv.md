---
title: "write_ssv"
canonical: https://tenzir.com/docs/reference/operators/write_ssv
source: https://tenzir.com/docs/reference/operators/write_ssv.md
section: "Docs"
---

# write_ssv

> Transforms event stream to SSV (Space-Separated Values) byte stream.

Transforms event stream to SSV (Space-Separated Values) byte stream.

```tql
write_ssv [list_separator=str, null_value=str, no_header=bool]
```

## Description

The `write_ssv` operator transforms an event stream into a byte stream by writing the events as SSV.

### `list_separator = str (optional)`

The string separating different elements in a list within a single field.

Defaults to `","`.

### `null_value = str (optional)`

The string denoting an absent value.

Defaults to `"-"`.

### `no_header = bool (optional)`

Whether to not print a header line containing the field names.

## Examples

Write an event as SSV.

```tql
from {x:1, y:true, z: "String"}
write_ssv
```

```plaintext
x y z
1 true String
```

## See Also

* [`print_ssv`](https://tenzir.com/docs/reference/functions/print_ssv.md)
* [`read_ssv`](https://tenzir.com/docs/reference/operators/read_ssv.md)
* [`write_csv`](https://tenzir.com/docs/reference/operators/write_csv.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
* [`write_tsv`](https://tenzir.com/docs/reference/operators/write_tsv.md)
* [`write_xsv`](https://tenzir.com/docs/reference/operators/write_xsv.md)
