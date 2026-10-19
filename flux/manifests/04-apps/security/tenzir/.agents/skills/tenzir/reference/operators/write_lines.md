---
title: "write_lines"
canonical: https://tenzir.com/docs/reference/operators/write_lines
source: https://tenzir.com/docs/reference/operators/write_lines.md
section: "Docs"
---

# write_lines

> Writes events as key-value pairsthe values of an event.

Writes events as key-value pairsthe *values* of an event.

```tql
write_lines
```

Tip

Use [`write_kv`](https://tenzir.com/docs/reference/operators/write_kv.md) operator if you also want to write the *key*s.

## Description

Each event is printed on a new line, with fields separated by spaces, and nulls skipped.

Note

The lines printer does not perform any escaping. Characters like `\n` and `"` are printed as is.

## Examples

### Write the values of an event

```tql
from {x:1, y:true, z: "String"}
write_lines
```

```txt
1 true String
```

## See Also

* [`read_lines`](https://tenzir.com/docs/reference/operators/read_lines.md)
* [`write_csv`](https://tenzir.com/docs/reference/operators/write_csv.md)
* [`write_kv`](https://tenzir.com/docs/reference/operators/write_kv.md)
* [`write_ssv`](https://tenzir.com/docs/reference/operators/write_ssv.md)
* [`write_tsv`](https://tenzir.com/docs/reference/operators/write_tsv.md)
* [`write_xsv`](https://tenzir.com/docs/reference/operators/write_xsv.md)
