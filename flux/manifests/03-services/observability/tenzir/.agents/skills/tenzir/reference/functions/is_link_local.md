---
title: "is_link_local"
canonical: https://tenzir.com/docs/reference/functions/is_link_local
source: https://tenzir.com/docs/reference/functions/is_link_local.md
section: "Docs"
---

# is_link_local

> Checks whether an IP address is a link-local address.

Checks whether an IP address is a link-local address.

```tql
is_link_local(x:ip) -> bool
```

## Description

The `is_link_local` function checks whether a given IP address `x` is a link-local address.

For IPv4, link-local addresses are in the range 169.254.0.0 to 169.254.255.255 (169.254.0.0/16).

For IPv6, link-local addresses are in the range fe80::/10.

Link-local addresses are used for communication between nodes on the same network segment and are not routable on the internet.

## Examples

### Check if an IP is link-local

```tql
from {
  ipv4_link_local: 169.254.1.1.is_link_local(),
  ipv6_link_local: fe80::1.is_link_local(),
  not_link_local: 192.168.1.1.is_link_local(),
}
```

```tql
{
  ipv4_link_local: true,
  ipv6_link_local: true,
  not_link_local: false,
}
```

## See Also

* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_global`](https://tenzir.com/docs/reference/functions/is_global.md)
* [`is_loopback`](https://tenzir.com/docs/reference/functions/is_loopback.md)
* [`is_multicast`](https://tenzir.com/docs/reference/functions/is_multicast.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [`is_v6`](https://tenzir.com/docs/reference/functions/is_v6.md)
