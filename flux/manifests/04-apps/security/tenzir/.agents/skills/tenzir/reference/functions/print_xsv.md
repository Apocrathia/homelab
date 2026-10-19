---
title: "print_xsv"
canonical: https://tenzir.com/docs/reference/functions/print_xsv
source: https://tenzir.com/docs/reference/functions/print_xsv.md
section: "Docs"
---

# print_xsv

> Prints a record as a delimited sequence of values.

Prints a record as a delimited sequence of values.

```tql
print_xsv(input:record, field_separator=str, list_separator=str, null_value=str) -> string
```

## Description

The `parse_xsv` function prints a record’s values as delimiter separated string.

The following table lists existing XSV configurations:

| Format                                                            | Field Separator | List Separator | Null Value |
| ----------------------------------------------------------------- | --------------- | -------------- | ---------- |
| [`csv`](https://tenzir.com/docs/reference/functions/print_csv.md) | `,`             | `;`            | empty      |
| [`ssv`](https://tenzir.com/docs/reference/functions/print_ssv.md) | `<space>`       | `,`            | `-`        |
| [`tsv`](https://tenzir.com/docs/reference/functions/print_tsv.md) | `\t`            | `,`            | `-`        |

### `field_separator = str`

The string separating different fields.

### `list_separator = str`

The string separating different elements in a list within a single field.

### `null_value = str`

The string denoting an absent value.

## Examples

```tql
from {
  x:1,
  y:true,
  z: "String",
}
output = this.print_xsv(
  field_separator=",",
  list_separator=";",
  null_value="null")
```

```tql
{
  x: 1,
  y: true,
  z: "String",
  output: "1,true,String",
}
```

## See Also

* [`parse_xsv`](https://tenzir.com/docs/reference/functions/parse_xsv.md)
* [`write_xsv`](https://tenzir.com/docs/reference/operators/write_xsv.md)
