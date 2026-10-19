---
title: "hash_sha3_512"
canonical: https://tenzir.com/docs/reference/functions/hash_sha3_512
source: https://tenzir.com/docs/reference/functions/hash_sha3_512.md
section: "Docs"
---

# hash_sha3_512

> Computes a SHA3-512 hash digest.

Computes a SHA3-512 hash digest.

```tql
hash_sha3_512(x:any, [seed=string]) -> string
```

## Description

The `hash_sha3_512` function calculates a SHA3-512 hash digest for the given value `x`.

## Examples

### Compute a SHA3-512 digest of a string

```tql
from {x: hash_sha3_512("foo")}
```

```tql
{x: "4bca2b137edc580fe50a88983ef860ebaca36c857b1f492839d6d7392452a63c82cbebc68e3b70a2a1480b4bb5d437a7cba6ecf9d89f9ff3ccd14cd6146ea7e7"}
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
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
