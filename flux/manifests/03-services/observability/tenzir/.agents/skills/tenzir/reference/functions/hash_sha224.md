---
title: "hash_sha224"
canonical: https://tenzir.com/docs/reference/functions/hash_sha224
source: https://tenzir.com/docs/reference/functions/hash_sha224.md
section: "Docs"
---

# hash_sha224

> Computes a SHA-224 hash digest.

Computes a SHA-224 hash digest.

```tql
hash_sha224(x:any, [seed=string]) -> string
```

## Description

The `hash_sha224` function calculates a SHA-224 hash digest for the given value `x`.

## Examples

### Compute a SHA-224 digest of a string

```tql
from {x: hash_sha224("foo")}
```

```tql
{x: "0808f64e60d58979fcb676c96ec938270dea42445aeefcd3a4e6f8db"}
```

## See Also

* [`hash_crc32`](https://tenzir.com/docs/reference/functions/hash_crc32.md)
* [`hash_md5`](https://tenzir.com/docs/reference/functions/hash_md5.md)
* [`hash_sha1`](https://tenzir.com/docs/reference/functions/hash_sha1.md)
* [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md)
* [`hash_sha384`](https://tenzir.com/docs/reference/functions/hash_sha384.md)
* [`hash_sha512`](https://tenzir.com/docs/reference/functions/hash_sha512.md)
* [`hash_sha3_224`](https://tenzir.com/docs/reference/functions/hash_sha3_224.md)
* [`hash_sha3_256`](https://tenzir.com/docs/reference/functions/hash_sha3_256.md)
* [`hash_sha3_384`](https://tenzir.com/docs/reference/functions/hash_sha3_384.md)
* [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md)
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
