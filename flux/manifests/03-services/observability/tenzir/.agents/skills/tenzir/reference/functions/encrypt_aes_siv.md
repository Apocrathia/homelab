---
title: "encrypt_aes_siv"
canonical: https://tenzir.com/docs/reference/functions/encrypt_aes_siv
source: https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md
section: "Docs"
---

# encrypt_aes_siv

> Encrypts a value deterministically with AES-SIV.

Encrypts a value deterministically with AES-SIV.

```tql
encrypt_aes_siv(x:blob|string, key=secret, [aad=blob|string]) -> blob
```

## Description

The `encrypt_aes_siv` function encrypts `x` with AES-SIV, as specified in RFC 5297. AES-SIV is a deterministic authenticated encryption mode: [`decrypt_aes_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md) detects any modification of the ciphertext.

The same input, key, and associated data always produce the same output. Equal values therefore stay equal after encryption, so you can still group, join, count distinct values, and deduplicate on encrypted fields. In return, the ciphertext reveals which values are equal and how often each value occurs. If you don’t need to compare encrypted values, use [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md) instead.

The output has the following layout:

```plaintext
synthetic IV (16 bytes) || ciphertext
```

The ciphertext has the same length as the input, so the output is 16 bytes longer than the input. This is the layout that RFC 5297 specifies.

The function passes the associated data to S2V as exactly one component, which is empty when you omit `aad`. Other RFC 5297 implementations can decrypt the output when they pass the associated data the same way.

The function returns a `blob`, which JSON output renders as Base64. To turn the result into a string, encode it with [`encode_base64`](https://tenzir.com/docs/reference/functions/encode_base64.md) or [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md).

Empty values and older OpenSSL versions

OpenSSL versions without the fix for CVE-2026-45446, such as 3.5.4 and 3.6.2, cannot process empty values with AES-SIV. If your Tenzir build uses such a version, the function returns `null` and emits a warning for empty values.

### `x: blob|string`

The value to encrypt.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning.

### `key = secret`

The encryption key as a secret.

AES-SIV uses two AES keys of equal size, so its key is twice as long as a regular AES key: 32 bytes for AES-128-SIV, 48 bytes for AES-192-SIV, and 64 bytes for AES-256-SIV. A key of any other size is an error when the pipeline starts.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds the key in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `key=secret("pii-key").decode_hex()`.

### `aad = blob|string (optional)`

Associated data that the function authenticates but does not encrypt. The value can differ per event, for example the name of a field or a tenant ID.

Different associated data produces a different output for the same value. Decryption only succeeds with the same associated data. Omitting `aad` is the same as passing an empty value.

If `aad` is `null`, for example because an event lacks the field that holds it, the function returns `null` and emits a warning. To fall back to an empty value instead, use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else), for example `aad=tenant? else ""`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret    | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| `pii-key` | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` |

### Encrypt equal values to equal outputs

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice@example.com"}, {user: "alice@example.com"}
user = encrypt_aes_siv(user, key=$key).encode_hex()
```

```tql
{
  user: "56BCA01D0E2760DC2470FB0FBAF17DFCB32F1ABCD62551F14DCF7BACD47AD6985B",
}
{
  user: "56BCA01D0E2760DC2470FB0FBAF17DFCB32F1ABCD62551F14DCF7BACD47AD6985B",
}
```

### Aggregate over an encrypted field

Because equal values stay equal, you can group by an encrypted field:

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice", action: "login"},
     {user: "bob", action: "login"},
     {user: "alice", action: "logout"}
user = encrypt_aes_siv(user, key=$key).encode_hex()
summarize user, events=count()
sort events
```

```tql
{
  user: "71779ED376A094C6F8EE99FD8FE82C184DFA73",
  events: 1,
}
{
  user: "9F38B1CD13F6589297040A621A7D2A797E815D9529",
  events: 2,
}
```

### Count distinct encrypted values

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice"}, {user: "bob"}, {user: "alice"}, {user: "carol"}
user = encrypt_aes_siv(user, key=$key)
summarize distinct_users=count_distinct(user)
```

```tql
{
  distinct_users: 3,
}
```

### Separate fields with associated data

Pass the field name as associated data so that the same value encrypts differently in different fields. This prevents correlating values across fields:

```tql
let $key = secret("pii-key").decode_hex()
from {email: "alice@example.com", username: "alice@example.com"}
email = encrypt_aes_siv(email, key=$key, aad="email").encode_hex()
username = encrypt_aes_siv(username, key=$key, aad="username").encode_hex()
```

```tql
{
  email: "721BFEB996719BEE95CA08F0A94E985551DDC00A1CA25DDC1155E00569E769784B",
  username: "AC894480EE5C05514FA062D7799AA8FF4CFACDFA52F3563F4A76AF7900BCFB0908",
}
```

## See Also

* [`decrypt_aes_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md)
* [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md)
* [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)
* [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)
* [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
