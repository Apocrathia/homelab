---
title: "write_xsv"
canonical: https://tenzir.com/docs/reference/operators/write_xsv
source: https://tenzir.com/docs/reference/operators/write_xsv.md
section: "Docs"
---

# write_xsv

> Transforms event stream to XSV byte stream.

Transforms event stream to XSV byte stream.

```tql
write_xsv field_separator=str, list_separator=str, null_value=str, [no_header=bool]
```

## Description

The [`xsv`](https://en.wikipedia.org/wiki/Delimiter-separated_values) format is a generalization of [comma-separated values (CSV)](https://en.wikipedia.org/wiki/Comma-separated_values) data in tabular form with a more flexible separator specification supporting tabs, commas, and spaces. The first line in an XSV file is the header that describes the field names. The remaining lines contain concrete values. One line corresponds to one event, minus the header.

The following table lists existing XSV configurations:

| Format                                                            | Field Separator | List Separator | Null Value |
| ----------------------------------------------------------------- | --------------- | -------------- | ---------- |
| [`csv`](https://tenzir.com/docs/reference/operators/write_csv.md) | `,`             | `;`            | empty      |
| [`ssv`](https://tenzir.com/docs/reference/operators/write_ssv.md) | `<space>`       | `,`            | `-`        |
| [`tsv`](https://tenzir.com/docs/reference/operators/write_tsv.md) | `\t`            | `,`            | `-`        |

Note that nested records have dot-separated field names.

### `field_separator = str`

The string separating different fields.

### `list_separator = str`

The string separating different elements in a list within a single field.

### `null_value = str`

The string denoting an absent value.

### `no_header=bool (optional)`

Whether to not print a header line containing the field names.

## Examples

```tql
from {x:1, y:true, z: "String"}
write_xsv field_separator="/", list_separator=";", null_value=""
```

```plaintext
x/y/z
1/true/String
```

## See Also

* [`print_xsv`](https://tenzir.com/docs/reference/functions/print_xsv.md)
* [`write_csv`](https://tenzir.com/docs/reference/operators/write_csv.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
* [`write_ssv`](https://tenzir.com/docs/reference/operators/write_ssv.md)
* [`write_tsv`](https://tenzir.com/docs/reference/operators/write_tsv.md)
