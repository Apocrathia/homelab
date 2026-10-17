---
title: "hash_sha384"
canonical: https://tenzir.com/docs/reference/functions/hash_sha384
source: https://tenzir.com/docs/reference/functions/hash_sha384.md
section: "Docs"
---

# hash_sha384

> Computes a SHA-384 hash digest.

Computes a SHA-384 hash digest.

```tql
hash_sha384(x:any, [seed=string]) -> string
```

## Description

The `hash_sha384` function calculates a SHA-384 hash digest for the given value `x`.

## Examples

### Compute a SHA-384 digest of a string

```tql
from {x: hash_sha384("foo")}
```

```tql
{x: "98c11ffdfdd540676b1a137cb1a22b2a70350c9a44171d6b1180c6be5cbb2ee3f79d532c8a1dd9ef2e8e08e752a3babb"}
```

## See Also

* [`hash_crc32`](https://tenzir.com/docs/reference/functions/hash_crc32.md)
* [`hash_md5`](https://tenzir.com/docs/reference/functions/hash_md5.md)
* [`hash_sha1`](https://tenzir.com/docs/reference/functions/hash_sha1.md)
* [`hash_sha224`](https://tenzir.com/docs/reference/functions/hash_sha224.md)
* [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md)
* [`hash_sha512`](https://tenzir.com/docs/reference/functions/hash_sha512.md)
* [`hash_sha3_224`](https://tenzir.com/docs/reference/functions/hash_sha3_224.md)
* [`hash_sha3_256`](https://tenzir.com/docs/reference/functions/hash_sha3_256.md)
* [`hash_sha3_384`](https://tenzir.com/docs/reference/functions/hash_sha3_384.md)
* [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md)
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
