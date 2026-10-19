---
title: "print_yaml"
canonical: https://tenzir.com/docs/reference/functions/print_yaml
source: https://tenzir.com/docs/reference/functions/print_yaml.md
section: "Docs"
---

# print_yaml

> Prints a value as a YAML document.

Prints a value as a YAML document.

```tql
print_yaml( input:any, [include_document_markers=bool] )
```

## Description

### `input:any`

The value to print as YAML.

### `include_document_markers = bool (optional)`

Includes the “start of document” and “end of document” markers in the result.

Defaults to `false`.

## Examples

```tql
from {x: { x: 0, y: 1 } }, { x: [0,1,2,] }
x = x.print_yaml()
```

```tql
{
  x: "x: 0\ny: 1",
}
{
  x: "- 0\n- 1\n- 2",
}
```

## See Also

* [`parse_yaml`](https://tenzir.com/docs/reference/functions/parse_yaml.md)
* [`write_yaml`](https://tenzir.com/docs/reference/operators/write_yaml.md)
