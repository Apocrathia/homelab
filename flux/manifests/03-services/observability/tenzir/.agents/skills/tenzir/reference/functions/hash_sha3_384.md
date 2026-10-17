---
title: "hash_sha3_384"
canonical: https://tenzir.com/docs/reference/functions/hash_sha3_384
source: https://tenzir.com/docs/reference/functions/hash_sha3_384.md
section: "Docs"
---

# hash_sha3_384

> Computes a SHA3-384 hash digest.

Computes a SHA3-384 hash digest.

```tql
hash_sha3_384(x:any, [seed=string]) -> string
```

## Description

The `hash_sha3_384` function calculates a SHA3-384 hash digest for the given value `x`.

## Examples

### Compute a SHA3-384 digest of a string

```tql
from {x: hash_sha3_384("foo")}
```

```tql
{x: "665551928d13b7d84ee02734502b018d896a0fb87eed5adb4c87ba91bbd6489410e11b0fbcc06ed7d0ebad559e5d3bb5"}
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
* [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md)
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
