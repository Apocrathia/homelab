---
title: "is_loopback"
canonical: https://tenzir.com/docs/reference/functions/is_loopback
source: https://tenzir.com/docs/reference/functions/is_loopback.md
section: "Docs"
---

# is_loopback

> Checks whether an IP address is a loopback address.

Checks whether an IP address is a loopback address.

```tql
is_loopback(x:ip) -> bool
```

## Description

The `is_loopback` function checks whether a given IP address `x` is a loopback address.

For IPv4, loopback addresses are in the range 127.0.0.0 to 127.255.255.255 (127.0.0.0/8).

For IPv6, the loopback address is ::1.

## Examples

### Check if an IP is loopback

```tql
from {
  ipv4_loopback: 127.0.0.1.is_loopback(),
  ipv6_loopback: ::1.is_loopback(),
  not_loopback: 8.8.8.8.is_loopback(),
}
```

```tql
{
  ipv4_loopback: true,
  ipv6_loopback: true,
  not_loopback: false,
}
```

## See Also

* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_global`](https://tenzir.com/docs/reference/functions/is_global.md)
* [`is_link_local`](https://tenzir.com/docs/reference/functions/is_link_local.md)
* [`is_multicast`](https://tenzir.com/docs/reference/functions/is_multicast.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [`is_v6`](https://tenzir.com/docs/reference/functions/is_v6.md)
