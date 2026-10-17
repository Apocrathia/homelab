---
title: "parent_dir"
canonical: https://tenzir.com/docs/reference/functions/parent_dir
source: https://tenzir.com/docs/reference/functions/parent_dir.md
section: "Docs"
---

# parent_dir

> Extracts the parent directory from a file path.

Extracts the parent directory from a file path.

```tql
parent_dir(x:string) -> string
```

## Description

The `parent_dir` function returns the parent directory path of the given file path, excluding the file name.

## Examples

### Extract the parent directory from a file path

```tql
from {x: parent_dir("/path/to/log.json")}
```

```tql
{x: "/path/to"}
```

## See Also

* [`file_name`](https://tenzir.com/docs/reference/functions/file_name.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
