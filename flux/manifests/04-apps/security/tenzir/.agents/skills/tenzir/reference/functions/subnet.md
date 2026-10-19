---
title: "subnet"
canonical: https://tenzir.com/docs/reference/functions/subnet
source: https://tenzir.com/docs/reference/functions/subnet.md
section: "Docs"
---

# subnet

> Converts an expression to a subnet value.

Converts an expression to a subnet value.

```tql
subnet(x:string|ip|subnet) -> subnet
subnet(x:string|ip|subnet, prefix:int) -> subnet
```

## Description

The `subnet` function converts an expression to a subnet.

### `x: string`

The string expression to convert. The string can be a CIDR subnet such as `"10.0.1.5/24"` or a plain IP address such as `"10.0.1.5"`.

Plain IPv4 addresses become `/32` host subnets, and plain IPv6 addresses become `/128` host subnets.

### `x: ip`

The IP address to convert. IPv4 addresses become `/32` host subnets, and IPv6 addresses become `/128` host subnets.

### `x: subnet`

The subnet to return unchanged.

### `prefix: int`

The CIDR prefix length for a plain IP address or subnet network address. IPv4 prefixes must be in the range `0` to `32`, and IPv6 prefixes must be in the range `0` to `128`.

Use `prefix` with plain IP values or existing subnet values. Strings that already contain CIDR notation return `null` when you also provide `prefix`.

## Examples

### Convert a string to a subnet

```tql
from {x: subnet("1.2.3.4/16")}
```

```tql
{x: 1.2.0.0/16}
```

### Convert an IP address to a subnet

```tql
from {x: subnet(10.10.1.124, 24)}
```

```tql
{x: 10.10.1.0/24}
```

### Convert a plain IP string to a host subnet

```tql
from {x: subnet("2001:db8::1")}
```

```tql
{x: 2001:db8::1/128}
```

## See Also

* [`float`](https://tenzir.com/docs/reference/functions/float.md)
* [`int`](https://tenzir.com/docs/reference/functions/int.md)
* [`ip`](https://tenzir.com/docs/reference/functions/ip.md)
* [`ip_category`](https://tenzir.com/docs/reference/functions/ip_category.md)
* [`is_global`](https://tenzir.com/docs/reference/functions/is_global.md)
* [`is_link_local`](https://tenzir.com/docs/reference/functions/is_link_local.md)
* [`is_loopback`](https://tenzir.com/docs/reference/functions/is_loopback.md)
* [`is_multicast`](https://tenzir.com/docs/reference/functions/is_multicast.md)
* [`is_private`](https://tenzir.com/docs/reference/functions/is_private.md)
* [`is_v4`](https://tenzir.com/docs/reference/functions/is_v4.md)
* [`is_v6`](https://tenzir.com/docs/reference/functions/is_v6.md)
* [`string`](https://tenzir.com/docs/reference/functions/string.md)
* [`time`](https://tenzir.com/docs/reference/functions/time.md)
* [`uint`](https://tenzir.com/docs/reference/functions/uint.md)
