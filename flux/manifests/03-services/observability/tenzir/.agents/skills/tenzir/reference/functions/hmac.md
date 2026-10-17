---
title: "hmac"
canonical: https://tenzir.com/docs/reference/functions/hmac
source: https://tenzir.com/docs/reference/functions/hmac.md
section: "Docs"
---

# hmac

> Computes an HMAC (Hash-based Message Authentication Code).

Computes an HMAC (Hash-based Message Authentication Code).

```tql
hmac(x:any, key:secret, [algorithm=string]) -> string
```

## Description

The `hmac` function computes an HMAC for the given value `x` using the provided `key`. HMAC combines a cryptographic hash function with a secret key to produce a message authentication code, useful for verifying both data integrity and authenticity.

### `x: any`

The value to authenticate. Strings and blobs are hashed directly; other types are first converted to their string representation.

### `key: secret`

The key for the HMAC computation, as a secret.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds the key in an encoded form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md).

### `algorithm = string (optional)`

The hash algorithm to use. Defaults to `"sha256"`.

Supported algorithms: `sha256`, `sha512`, `sha384`, `sha1`, `md5`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret         | Value                               |
| -------------- | ----------------------------------- |
| `hmac-key`     | `key`                               |
| `hmac-hex-key` | `6b6579`, the bytes of `key` in hex |

### Compute an HMAC with the default algorithm (SHA-256)

```tql
from {message: "The quick brown fox jumps over the lazy dog"}
digest = hmac(message, secret("hmac-key"))
```

```tql
{
  message: "The quick brown fox jumps over the lazy dog",
  digest: "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
}
```

### Compute an HMAC with SHA-512

```tql
from {message: "The quick brown fox jumps over the lazy dog"}
digest = hmac(message, secret("hmac-key"), algorithm="sha512")
```

```tql
{
  message: "The quick brown fox jumps over the lazy dog",
  digest: "b42af09057bac1e2d41708e48a902e09b5ff7f12ab428a4fe86653c73dd248fb82f948a549f7b791a5b41915ee4d1ec3935357e4e2317250d0372afa2ebeeb3a",
}
```

### Decode a key from the secret store

Secret stores often hold binary keys in hex or Base64 form. Decode the secret before you pass it to `hmac`:

```tql
from {message: "The quick brown fox jumps over the lazy dog"}
digest = hmac(message, secret("hmac-hex-key").decode_hex())
```

```tql
{
  message: "The quick brown fox jumps over the lazy dog",
  digest: "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
}
```

## See Also

* [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md)
* [`hash_sha512`](https://tenzir.com/docs/reference/functions/hash_sha512.md)
* [`hash_sha384`](https://tenzir.com/docs/reference/functions/hash_sha384.md)
* [`hash_sha1`](https://tenzir.com/docs/reference/functions/hash_sha1.md)
* [`hash_md5`](https://tenzir.com/docs/reference/functions/hash_md5.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
