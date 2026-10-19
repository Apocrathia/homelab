---
title: "hash_xxh3"
canonical: https://tenzir.com/docs/reference/functions/hash_xxh3
source: https://tenzir.com/docs/reference/functions/hash_xxh3.md
section: "Docs"
---

# hash_xxh3

> Computes an XXH3 hash digest.

Computes an XXH3 hash digest.

```tql
hash_xxh3(x:any, [seed=string]) -> string
```

## Description

The `hash_xxh3` function calculates a 64-bit XXH3 hash digest for the given value `x`.

## Examples

### Compute an XXH3 digest of a string

```tql
from {x: hash_xxh3("foo")}
```

```tql
{x: "ab6e5f64077e7d8a"}
```

## See Also

* [`hash_crc32`](https://tenzir.com/docs/reference/functions/hash_crc32.md)
* [`hash_md5`](https://tenzir.com/docs/reference/functions/hash_md5.md)
* [`hash_sha1`](https://tenzir.com/docs/reference/functions/hash_sha1.md)
* [`hash_sha224`](https://tenzir.com/docs/reference/functions/hash_sha224.md)
* [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md)
* [`hash_sha384`](https://tenzir.com/docs/reference/functions/hash_sha384.md)
* [`hash_sha512`](https://tenzir.com/docs/reference/functions/hash_sha512.md)
* [`hash_sha3_224`](https://tenzir.com/docs/reference/functions/hash_sha3_224.md)
* [`hash_sha3_256`](https://tenzir.com/docs/reference/functions/hash_sha3_256.md)
* [`hash_sha3_384`](https://tenzir.com/docs/reference/functions/hash_sha3_384.md)
* [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
