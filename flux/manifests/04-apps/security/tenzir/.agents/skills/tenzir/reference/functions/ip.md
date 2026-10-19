---
title: "ip"
canonical: https://tenzir.com/docs/reference/functions/ip
source: https://tenzir.com/docs/reference/functions/ip.md
section: "Docs"
---

# ip

> Casts an expression to an IP address.

Casts an expression to an IP address.

```tql
ip(x:string) -> ip
```

## Description

The `ip` function casts the provided string `x` to an IP address.

## Examples

### Cast a string to an IP address

```tql
from {x: ip("1.2.3.4")}
```

```tql
{x: 1.2.3.4}
```

## See Also

* [`float`](https://tenzir.com/docs/reference/functions/float.md)
* [`int`](https://tenzir.com/docs/reference/functions/int.md)
* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_global`](https://tenzir.com/docs/reference/functions/is_global.md)
* [`is_link_local`](https://tenzir.com/docs/reference/functions/is_link_local.md)
* [`is_loopback`](https://tenzir.com/docs/reference/functions/is_loopback.md)
* [`is_multicast`](https://tenzir.com/docs/reference/functions/is_multicast.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [`is_v6`](https://tenzir.com/docs/reference/functions/is_v6.md)
* [`string`](https://tenzir.com/docs/reference/functions/string.md)
* [`subnet`](https://tenzir.com/docs/reference/functions/subnet.md)
* [`time`](https://tenzir.com/docs/reference/functions/time.md)
* [`uint`](https://tenzir.com/docs/reference/functions/uint.md)
