---
title: "to_title"
canonical: https://tenzir.com/docs/reference/functions/to_title
source: https://tenzir.com/docs/reference/functions/to_title.md
section: "Docs"
---

# to_title

> Converts a string to title case.

Converts a string to title case.

```tql
to_title(x:string) -> string
```

## Description

The `to_title` function converts all words in `x` to title case.

## Examples

### Convert a string to title case

```tql
from {x: "hello world".to_title()}
```

```tql
{x: "Hello World"}
```

## See Also

* [`capitalize`](https://tenzir.com/docs/reference/functions/capitalize.md)
* [`is_title`](https://tenzir.com/docs/reference/functions/is_title.md)
* [`to_lower`](https://tenzir.com/docs/reference/functions/to_lower.md)
* [`to_upper`](https://tenzir.com/docs/reference/functions/to_upper.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
