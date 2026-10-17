---
title: "env"
canonical: https://tenzir.com/docs/reference/functions/env
source: https://tenzir.com/docs/reference/functions/env.md
section: "Docs"
---

# env

> Reads an environment variable.

Reads an environment variable.

```tql
env(x:string) -> string
```

## Description

The `env` function retrieves the value of an environment variable `x`. If the variable does not exist, it returns `null`.

## Examples

### Read the `PATH` environment variable

```tql
from {x: env("PATH")}
```

```tql
{x: "/usr/local/bin:/usr/bin:/bin"}
```

## See Also

* [`config`](https://tenzir.com/docs/reference/functions/config.md)
* [`secret`](https://tenzir.com/docs/reference/functions/secret.md)
