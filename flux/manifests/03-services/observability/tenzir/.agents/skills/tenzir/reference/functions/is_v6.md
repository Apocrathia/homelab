---
title: "is_v6"
canonical: https://tenzir.com/docs/reference/functions/is_v6
source: https://tenzir.com/docs/reference/functions/is_v6.md
section: "Docs"
---

# is_v6

> Checks whether an IP address has version number 6.

Checks whether an IP address has version number 6.

```tql
is_v6(x:ip) -> bool
```

## Description

The `is_v6` function checks whether the version number of a given IP address `x` is 6.

## Examples

### Check if an IP is IPv6

```tql
from {
  x: 1.2.3.4.is_v6(),
  y: ::1.is_v6(),
}
```

```tql
{
  x: false,
  y: true,
}
```

## See Also

* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_global`](https://tenzir.com/docs/reference/functions/is_global.md)
* [`is_link_local`](https://tenzir.com/docs/reference/functions/is_link_local.md)
* [`is_loopback`](https://tenzir.com/docs/reference/functions/is_loopback.md)
* [`is_multicast`](https://tenzir.com/docs/reference/functions/is_multicast.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
