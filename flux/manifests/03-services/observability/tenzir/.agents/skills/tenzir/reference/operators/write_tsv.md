---
title: "write_tsv"
canonical: https://tenzir.com/docs/reference/operators/write_tsv
source: https://tenzir.com/docs/reference/operators/write_tsv.md
section: "Docs"
---

# write_tsv

> Transforms event stream to TSV (Tab-Separated Values) byte stream.

Transforms event stream to TSV (Tab-Separated Values) byte stream.

```tql
write_tsv [list_separator=str, null_value=str, no_header=bool]
```

## Description

The `write_tsv` operator transforms an event stream into a byte stream by writing the events as TSV.

### `list_separator = str (optional)`

The string separating different elements in a list within a single field.

Defaults to `","`.

### `null_value = str (optional)`

The string denoting an absent value.

Defaults to `"-"`.

### `no_header = bool (optional)`

Whether to not print a header line containing the field names.

## Examples

Write an event as TSV.

```tql
from {x:1, y:true, z: "String"}
write_tsv
```

```plaintext
x  y  z
1  true  String
```

## See Also

* [`write_csv`](https://tenzir.com/docs/reference/operators/write_csv.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
* [`write_ssv`](https://tenzir.com/docs/reference/operators/write_ssv.md)
* [`write_xsv`](https://tenzir.com/docs/reference/operators/write_xsv.md)
