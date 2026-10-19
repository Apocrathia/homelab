---
title: "encrypt_aes_gcm_siv"
canonical: https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv
source: https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md
section: "Docs"
---

# encrypt_aes_gcm_siv

> Encrypts a value with AES-GCM-SIV.

Encrypts a value with AES-GCM-SIV.

```tql
encrypt_aes_gcm_siv(x:blob|string, key=secret, [aad=blob|string]) -> blob
```

## Description

The `encrypt_aes_gcm_siv` function encrypts `x` with AES-GCM-SIV, as specified in RFC 8452. AES-GCM-SIV is an authenticated encryption mode: [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md) detects any modification of the ciphertext.

The function draws a fresh random 96-bit nonce for every value. Encrypting the same value twice therefore yields different outputs, and the output differs on every run.

Unlike AES-GCM, AES-GCM-SIV resists nonce misuse. If a nonce ever repeats, an attacker learns only whether the two values with that nonce are equal. This makes AES-GCM-SIV a better fit than [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md) for high-volume pipelines. Use it as the default for reversible encryption.

The output has the following layout:

```plaintext
nonce (12 bytes) || ciphertext || tag (16 bytes)
```

The ciphertext has the same length as the input, so the output is 28 bytes longer than the input. The ciphertext and the tag follow RFC 8452, and the nonce in front makes every value self-contained. Other RFC 8452 implementations can decrypt the output after they split off the first 12 bytes as the nonce.

The function returns a `blob`, which JSON output renders as Base64. To turn the result into a string, encode it with [`encode_base64`](https://tenzir.com/docs/reference/functions/encode_base64.md) or [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md).

### `x: blob|string`

The value to encrypt.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning.

### `key = secret`

The encryption key as a secret.

The key size selects the AES variant: 16 bytes for AES-128-GCM-SIV and 32 bytes for AES-256-GCM-SIV. RFC 8452 doesn’t define a variant for 24-byte keys. A key of any other size is an error when the pipeline starts.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds the key in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `key=secret("pii-key").decode_hex()`.

### `aad = blob|string (optional)`

Associated data that the function authenticates but does not encrypt. The value can differ per event, for example the name of a field or a tenant ID.

Decryption only succeeds with the same associated data. Omitting `aad` is the same as passing an empty value.

If `aad` is `null`, for example because an event lacks the field that holds it, the function returns `null` and emits a warning. To fall back to an empty value instead, use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else), for example `aad=tenant? else ""`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret    | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| `pii-key` | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` |

### Encrypt and decrypt a field

```tql
let $key = secret("pii-key").decode_hex()
from {email: "alice@example.com"}
encrypted = encrypt_aes_gcm_siv(email, key=$key)
decrypted = decrypt_aes_gcm_siv(encrypted, key=$key).string()
drop encrypted
```

```tql
{
  email: "alice@example.com",
  decrypted: "alice@example.com",
}
```

### Encrypt the same value twice

Every encryption uses a new random nonce, so equal values encrypt to different outputs:

```tql
let $key = secret("pii-key").decode_hex()
from {email: "alice@example.com"}
first = encrypt_aes_gcm_siv(email, key=$key)
second = encrypt_aes_gcm_siv(email, key=$key)
equal = first == second
drop first, second
```

```tql
{
  email: "alice@example.com",
  equal: false,
}
```

### Check the size of the output

The hex encoding uses two digits per byte, so the 17-byte input grows to 45 bytes: 12 bytes of nonce and 16 bytes of tag.

```tql
let $key = secret("pii-key").decode_hex()
from {email: "alice@example.com"}
encrypted = encrypt_aes_gcm_siv(email, key=$key)
input_hex_digits = email.encode_hex().length_bytes()
output_hex_digits = encrypted.encode_hex().length_bytes()
drop encrypted
```

```tql
{
  email: "alice@example.com",
  input_hex_digits: 34,
  output_hex_digits: 90,
}
```

### Bind the ciphertext to a user

Pass the user name as associated data so that the ciphertext only decrypts in the context of that user. Decryption with different associated data returns `null` and emits a warning:

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice", email: "alice@example.com"}
email = encrypt_aes_gcm_siv(email, key=$key, aad=user)
same_user = decrypt_aes_gcm_siv(email, key=$key, aad="alice").string()
other_user = decrypt_aes_gcm_siv(email, key=$key, aad="bob").string()
drop email
```

```tql
{
  user: "alice",
  same_user: "alice@example.com",
  other_user: null,
}
```

## See Also

* [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md)
* [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)
* [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)
* [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)
* [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
