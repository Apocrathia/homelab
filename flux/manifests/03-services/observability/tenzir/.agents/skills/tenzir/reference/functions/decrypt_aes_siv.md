---
title: "decrypt_aes_siv"
canonical: https://tenzir.com/docs/reference/functions/decrypt_aes_siv
source: https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md
section: "Docs"
---

# decrypt_aes_siv

> Decrypts a value that was encrypted with AES-SIV.

Decrypts a value that was encrypted with AES-SIV.

```tql
decrypt_aes_siv(x:blob|string, key=secret, [aad=blob|string]) -> blob
```

## Description

The `decrypt_aes_siv` function decrypts the output of [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md). It expects the following layout:

```plaintext
synthetic IV (16 bytes) || ciphertext
```

This is the layout that RFC 5297 specifies. The function passes the associated data to S2V as exactly one component, which is empty when you omit `aad`. You can therefore decrypt values that other RFC 5297 implementations encrypted with a single associated data component.

The function verifies the synthetic IV before it returns a value. When the key or the associated data don’t match, or when the ciphertext was modified, the function returns `null` and emits a warning once per batch.

The function returns a `blob`. Use [`string`](https://tenzir.com/docs/reference/functions/string.md) to convert the result to a string when the plaintext is text.

Empty values and older OpenSSL versions

OpenSSL versions without the fix for CVE-2026-45446, such as 3.5.4 and 3.6.2, cannot process empty values with AES-SIV. If your Tenzir build uses such a version, the function returns `null` and emits a warning for empty values.

### `x: blob|string`

The value to decrypt.

The function treats a string as raw bytes. If your ciphertext arrives as Base64 or hex text, for example in JSON, decode it first with [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md) or [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md).

The function returns `null` for `null` values. For values of other types, and for values shorter than 16 bytes, it returns `null` and emits a warning.

### `key = secret`

The key that encrypted the value, as a secret.

AES-SIV uses two AES keys of equal size, so its key is twice as long as a regular AES key: 32 bytes for AES-128-SIV, 48 bytes for AES-192-SIV, and 64 bytes for AES-256-SIV. A key of any other size is an error when the pipeline starts.

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

### Decrypt a hex-encoded ciphertext

Decode the hex text before you decrypt it:

```tql
let $key = secret("pii-key").decode_hex()
from {user: "56BCA01D0E2760DC2470FB0FBAF17DFCB32F1ABCD62551F14DCF7BACD47AD6985B"}
user = user.decode_hex().decrypt_aes_siv(key=$key).string()
```

```tql
{
  user: "alice@example.com",
}
```

### Decrypt with associated data

Pass the same associated data as during encryption. A value that was encrypted for the `email` field doesn’t decrypt as a `username`, so the function returns `null` and emits a warning:

```tql
let $key = secret("pii-key").decode_hex()
from {email: "721BFEB996719BEE95CA08F0A94E985551DDC00A1CA25DDC1155E00569E769784B"}
right_field = email.decode_hex().decrypt_aes_siv(key=$key, aad="email").string()
wrong_field = email.decode_hex().decrypt_aes_siv(key=$key, aad="username").string()
drop email
```

```tql
{
  right_field: "alice@example.com",
  wrong_field: null,
}
```

### Round-trip values

Empty values round-trip, and `null` stays `null`:

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice"}, {user: ""}, {user: null}
encrypted = encrypt_aes_siv(user, key=$key)
decrypted = decrypt_aes_siv(encrypted, key=$key).string()
drop encrypted
```

```tql
{
  user: "alice",
  decrypted: "alice",
}
{
  user: "",
  decrypted: "",
}
{
  user: null,
  decrypted: null,
}
```

## See Also

* [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)
* [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md)
* [`decrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm.md)
* [`decrypt_hpke`](https://tenzir.com/docs/reference/functions/decrypt_hpke.md)
* [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
