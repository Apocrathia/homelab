---
title: "print_ssv"
canonical: https://tenzir.com/docs/reference/functions/print_ssv
source: https://tenzir.com/docs/reference/functions/print_ssv.md
section: "Docs"
---

# print_ssv

> Prints a record as a space-separated string of values.

Prints a record as a space-separated string of values.

```tql
print_ssv(input:record, [list_separator=str, null_value=str]) -> string
```

## Description

The `print_ssv` function prints a record’s values as a space separated string.

### `input: record`

The record you want to print.

### `list_separator = str (optional)`

The string separating the elements in list fields.

Defaults to `“,”`.

### `null_value = str (optional)`

The string denoting an absent value.

Defaults to `“-”`.

## Examples

### Print a record as space

```tql
from {x:1, y:true, z: "String"}
output = this.print_ssv()
```

```tql
{
  x: 1,
  y: true,
  z: "String",
  output: "1 true String",
}
```

## See Also

* [`write_ssv`](https://tenzir.com/docs/reference/operators/write_ssv.md)
* [`parse_ssv`](https://tenzir.com/docs/reference/functions/parse_ssv.md)
