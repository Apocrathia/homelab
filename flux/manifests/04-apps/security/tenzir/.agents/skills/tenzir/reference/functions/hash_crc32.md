---
title: "hash_crc32"
canonical: https://tenzir.com/docs/reference/functions/hash_crc32
source: https://tenzir.com/docs/reference/functions/hash_crc32.md
section: "Docs"
---

# hash_crc32

> Computes a CRC-32 checksum.

Computes a CRC-32 checksum.

```tql
hash_crc32(x:any, [seed=string]) -> string
```

## Description

The `hash_crc32` function calculates the CRC-32 checksum of `x` and returns it as 8 lowercase hex digits. It implements CRC-32/ISO-HDLC, the CRC-32 of zlib, gzip, and PNG, so it matches the checksums of other tools, such as Python’s `zlib.crc32`.

CRC-32 is not cryptographic

CRC-32 detects accidental changes, but anyone can construct an input with a given checksum, and 32 bits produce collisions after tens of thousands of values. Never use CRC-32 to pseudonymize or protect data. Use [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md) instead, or [`hmac`](https://tenzir.com/docs/reference/functions/hmac.md) with a secret key for values that an attacker could guess.

### `x: any`

The value to hash. For strings and blobs, the function hashes only their bytes.

### `seed = string (optional)`

A string that the function hashes before `x`.

## Examples

### Compute a CRC-32 checksum of a string

```tql
from {x: hash_crc32("123456789")}
```

```tql
{x: "cbf43926"}
```

## See Also

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
* [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md)
* [`hmac`](https://tenzir.com/docs/reference/functions/hmac.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
