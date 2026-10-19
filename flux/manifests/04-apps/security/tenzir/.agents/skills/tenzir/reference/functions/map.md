---
title: "map"
canonical: https://tenzir.com/docs/reference/functions/map
source: https://tenzir.com/docs/reference/functions/map.md
section: "Docs"
---

# map

> Maps each list element to an expression.

Maps each list element to an expression.

```tql
map(xs:list, capture:field, any->any) -> list
```

## Description

The `map` function applies an expression to each element within a list, returning a list of the same length.

If `xs` is `null`, `map` returns `null` without evaluating the lambda. When you spread that result into a list, the `null` contributes no elements.

### `xs: list`

A list of values.

### `function: any -> any`

A lambda function that is applied to each list element.

The lambda may return a different type for each element. The result keeps every value with its own type, so a list can mix strings, numbers, records, and lists.

## Examples

### Check a predicate for all members of a list

```tql
from {
  hosts: [1.2.3.4, 127.0.0.1, 10.0.0.127]
}
hosts = hosts.map(x => x in 10.0.0.0/8)
```

```tql
{
  hosts: [false, false, true]
}
```

### Reshape a record inside a list

```tql
from {
  answers: [
    {
      rdata: 76.76.21.21,
      rrname: "tenzir.com"
    }
  ]
}
answers = answers.map(x => {hostname: x.rrname, ip: x.rdata})
```

```tql
{
  answers: [
    {
      hostname: "tenzir.com",
      ip: "76.76.21.21",
    }
  ]
}
```

### Null values

In the below example, the first entry does not match the given grok pattern, causing `parse_grok` to emit a `null`.

The `map` function preserves the `null` at that position and maps the other elements normally. The result has the same length as the input.

```tql
let $pattern = "%{WORD:w} %{NUMBER:n}"


from {
  l: ["hello", "world 42"]
}
l = l.map(str => str.parse_grok($pattern))
```

```tql
{
  l: [
    null,
    { w: "world", n: 42, },
  ],
}
```

### Map a nullable list before spreading

If the input list is `null`, [`map`](https://tenzir.com/docs/reference/functions/map.md) returns `null`, and list spread contributes no elements:

```tql
from {xs: null}
ys = [
  ...xs.map(x => x + 1),
  0,
]
```

```tql
{
  xs: null,
  ys: [
    0,
  ],
}
```

### Mixed types in the result

The list `l` contains three JSON strings: two objects and one array. Applying [`parse_json`](https://tenzir.com/docs/reference/functions/parse_json.md) to each element returns two records and one list, preserving their fields and types:

```tql
from {
  l: [
    r#"{ "x": 0 }"#,
    r#"{ "y": 0 }"#,
    r#"[ 3 ]"#,
  ]
}
l = l.map(str => str.parse_json())
```

```tql
{
  l: [
    {x: 0},
    {y: 0},
    [3],
  ]
}
```

## See Also

* [`where`](https://tenzir.com/docs/reference/functions/where.md)
* [`zip`](https://tenzir.com/docs/reference/functions/zip.md)
* [Shape lists](../../guides/shape/shape-lists.md)
