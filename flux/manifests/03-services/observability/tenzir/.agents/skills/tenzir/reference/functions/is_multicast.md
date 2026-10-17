---
title: "is_multicast"
canonical: https://tenzir.com/docs/reference/functions/is_multicast
source: https://tenzir.com/docs/reference/functions/is_multicast.md
section: "Docs"
---

# is_multicast

> Checks whether an IP address is a multicast address.

Checks whether an IP address is a multicast address.

```tql
is_multicast(x:ip) -> bool
```

## Description

The `is_multicast` function checks whether a given IP address `x` is a multicast address.

For IPv4, multicast addresses are in the range 224.0.0.0 to 239.255.255.255 (224.0.0.0/4).

For IPv6, multicast addresses start with the prefix ff00::/8.

## Examples

### Check if an IP is multicast

```tql
from {
  ipv4_multicast: 224.0.0.1.is_multicast(),
  ipv6_multicast: ff02::1.is_multicast(),
  not_multicast: 8.8.8.8.is_multicast(),
}
```

```tql
{
  ipv4_multicast: true,
  ipv6_multicast: true,
  not_multicast: false,
}
```

## See Also

* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_global`](https://tenzir.com/docs/reference/functions/is_global.md)
* [`is_link_local`](https://tenzir.com/docs/reference/functions/is_link_local.md)
* [`is_loopback`](https://tenzir.com/docs/reference/functions/is_loopback.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [`is_v6`](https://tenzir.com/docs/reference/functions/is_v6.md)
