---
title: "hash_sha3_256"
canonical: https://tenzir.com/docs/reference/functions/hash_sha3_256
source: https://tenzir.com/docs/reference/functions/hash_sha3_256.md
section: "Docs"
---

# hash_sha3_256

> Computes a SHA3-256 hash digest.

Computes a SHA3-256 hash digest.

```tql
hash_sha3_256(x:any, [seed=string]) -> string
```

## Description

The `hash_sha3_256` function calculates a SHA3-256 hash digest for the given value `x`.

## Examples

### Compute a SHA3-256 digest of a string

```tql
from {x: hash_sha3_256("foo")}
```

```tql
{x: "76d3bc41c9f588f7fcd0d5bf4718f8f84b1c41b20882703100b9eb9413807c01"}
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
* [`hash_sha3_384`](https://tenzir.com/docs/reference/functions/hash_sha3_384.md)
* [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md)
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
