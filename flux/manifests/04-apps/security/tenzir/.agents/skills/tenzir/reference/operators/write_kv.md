---
title: "write_kv"
canonical: https://tenzir.com/docs/reference/operators/write_kv
source: https://tenzir.com/docs/reference/operators/write_kv.md
section: "Docs"
---

# write_kv

> Writes events in a Key-Value format.

Writes events in a Key-Value format.

```tql
write_kv [field_separator=str, value_separator=str, list_separator=str,
          flatten_separator=str, null_value=str]
```

## Description

Writes events in a Key-Value format, with one event per line. Nested data will be flattend, keys or values containing the given separators will be quoted and the special characters `\n`, `\r`, `\` and `"` will be escaped.

### `field_separator = str (optional)`

A string that shall separate the key-value pairs.

Must not be an empty string.

Defaults to `" "`.

### `value_separator = str (optional)`

A string that shall separate key and value within key-value pair.

Must not be an empty string.

Defaults to `"="`.

### `list_separator = str (optional)`

Must not be an empty string.

Defaults to `","`.

### `flatten_separator = str (optional)`

A string to join the keys of nested records with. For example, given `flatten="."`

Defaults to `"."`.

### `null_value = str (optional)`

A string to represent null values.

Defaults to the empty string.

## Examples

### Write key-value pairs with quoted strings

```tql
from {x: "hello world", y: "hello=world"}
```

```txt
x="hello world" y:"hello=world"
```

### Write key-value pairs of nested records

```tql
from {x: {y: {z:0}, y2:42}, a: "string" }
write_kv
```

```txt
x.y.z=0 y.y2=42 a=string
```

## See Also

* [`parse_kv`](https://tenzir.com/docs/reference/functions/parse_kv.md)
* [`print_kv`](https://tenzir.com/docs/reference/functions/print_kv.md)
* [`read_kv`](https://tenzir.com/docs/reference/operators/read_kv.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
