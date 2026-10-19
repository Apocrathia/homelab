---
title: "is_global"
canonical: https://tenzir.com/docs/reference/functions/is_global
source: https://tenzir.com/docs/reference/functions/is_global.md
section: "Docs"
---

# is_global

> Checks whether an IP address is a global address.

Checks whether an IP address is a global address.

```tql
is_global(x:ip) -> bool
```

## Description

The `is_global` function checks whether a given IP address `x` is a global address. A global address is a publicly routable address that is not:

* Loopback (127.0.0.0/8 for IPv4, ::1 for IPv6)
* Private (RFC 1918 for IPv4, RFC 4193 for IPv6)
* Link-local (169.254.0.0/16 for IPv4, fe80::/10 for IPv6)
* Multicast (224.0.0.0/4 for IPv4, ff00::/8 for IPv6)
* Broadcast (255.255.255.255 for IPv4)
* Unspecified (0.0.0.0 for IPv4, :: for IPv6)

## Examples

### Check if an IP is global

```tql
from {
  global_ipv4: 8.8.8.8.is_global(),
  global_ipv6: 2001:4860:4860::8888.is_global(),
  private: 192.168.1.1.is_global(),
  loopback: 127.0.0.1.is_global(),
  link_local: 169.254.1.1.is_global(),
}
```

```tql
{
  global_ipv4: true,
  global_ipv6: true,
  private: false,
  loopback: false,
  link_local: false,
}
```

## See Also

* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_link_local`](https://tenzir.com/docs/reference/functions/is_link_local.md)
* [`is_loopback`](https://tenzir.com/docs/reference/functions/is_loopback.md)
* [`is_multicast`](https://tenzir.com/docs/reference/functions/is_multicast.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [`is_v6`](https://tenzir.com/docs/reference/functions/is_v6.md)
