---
title: "decrypt_aes_gcm"
canonical: https://tenzir.com/docs/reference/functions/decrypt_aes_gcm
source: https://tenzir.com/docs/reference/functions/decrypt_aes_gcm.md
section: "Docs"
---

# decrypt_aes_gcm

> Decrypts a value that was encrypted with AES-GCM.

Decrypts a value that was encrypted with AES-GCM.

```tql
decrypt_aes_gcm(x:blob|string, key=secret, [aad=blob|string]) -> blob
```

## Description

The `decrypt_aes_gcm` function decrypts the output of [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md). It expects the following layout:

```plaintext
nonce (12 bytes) || ciphertext || tag (16 bytes)
```

The ciphertext and the tag follow NIST SP 800-38D. You can therefore decrypt values that other AES-GCM implementations encrypted, as long as they use a 16-byte tag and prefix the 12-byte nonce.

The function verifies the authentication tag before it returns a value. When the key or the associated data don’t match, or when the ciphertext was modified, the function returns `null` and emits a warning once per batch.

The function returns a `blob`. Use [`string`](https://tenzir.com/docs/reference/functions/string.md) to convert the result to a string when the plaintext is text.

### `x: blob|string`

The value to decrypt.

The function treats a string as raw bytes. If your ciphertext arrives as Base64 or hex text, for example in JSON, decode it first with [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md) or [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md).

The function returns `null` for `null` values. For values of other types, and for values shorter than 28 bytes, it returns `null` and emits a warning.

### `key = secret`

The key that encrypted the value, as a secret.

The key size selects the AES variant: 16 bytes for AES-128, 24 bytes for AES-192, and 32 bytes for AES-256. A key of any other size is an error when the pipeline starts.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds the key in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `key=secret("pii-key").decode_hex()`.

### `aad = blob|string (optional)`

The associated data that was passed during encryption. The value can differ per event.

Decryption only succeeds with the same associated data. Omitting `aad` is the same as passing an empty value.

If `aad` is `null`, for example because an event lacks the field that holds it, the function returns `null` and emits a warning. To fall back to an empty value instead, use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else), for example `aad=tenant? else ""`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret    | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| `pii-key` | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` |

### Decrypt a Base64-encoded ciphertext

Decode the Base64 text before you decrypt it:

```tql
let $key = secret("pii-key").decode_hex()
from {email: "wOwLPBSsnwNx912jWfFylNy/eNlknx0ziHeHUjLxLMLnKGMI6HELs3aUMaN5"}
email = email.decode_base64().decrypt_aes_gcm(key=$key).string()
```

```tql
{
  email: "alice@example.com",
}
```

### Decrypt with associated data

Pass the same associated data as during encryption, here the user name:

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice", email: "7QCXlVoGX06ZDsLsTLXwRFMnsKKCMldGF9y2s/tJRMY7hXbybzg1teW+C3yw"}
email = email.decode_base64().decrypt_aes_gcm(key=$key, aad=user).string()
```

```tql
{
  user: "alice",
  email: "alice@example.com",
}
```

### Detect undecoded input

Without decoding, the function interprets the Base64 characters as ciphertext bytes. Authentication fails, so the function returns `null` and emits a warning:

```tql
let $key = secret("pii-key").decode_hex()
from {email: "wOwLPBSsnwNx912jWfFylNy/eNlknx0ziHeHUjLxLMLnKGMI6HELs3aUMaN5"}
decoded = email.decode_base64().decrypt_aes_gcm(key=$key).string()
not_decoded = email.decrypt_aes_gcm(key=$key).string()
drop email
```

```tql
{
  decoded: "alice@example.com",
  not_decoded: null,
}
```

## See Also

* [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)
* [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md)
* [`decrypt_aes_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md)
* [`decrypt_hpke`](https://tenzir.com/docs/reference/functions/decrypt_hpke.md)
* [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
