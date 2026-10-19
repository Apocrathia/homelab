---
title: "decrypt_ff1"
canonical: https://tenzir.com/docs/reference/functions/decrypt_ff1
source: https://tenzir.com/docs/reference/functions/decrypt_ff1.md
section: "Docs"
---

# decrypt_ff1

> Decrypts a string that was encrypted with format-preserving encryption (FF1).

Decrypts a string that was encrypted with format-preserving encryption (FF1).

```tql
decrypt_ff1(x:string, key=secret, [alphabet=string, tweak=blob|string]) -> string
```

## Description

The `decrypt_ff1` function decrypts the output of [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md) with FF1 over AES, as specified in NIST SP 800-38G. The output has the same length as the input and uses the same alphabet.

The function only decrypts the characters of the alphabet. All other characters pass through unchanged, so separators such as dashes and spaces stay in place.

To restore the original value, pass the same key, alphabet, and tweak as during encryption.

FF1 preserves the length and the alphabet, but not check digits. If you kept card numbers Luhn-valid by encrypting them without their check digit and appending a new one with [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md), decrypt them the same way, as the example below shows.

FF1 does not authenticate

FF1 can’t detect a wrong key or a modified ciphertext. Decrypting with the wrong key or tweak silently returns a wrong value of the right format. If you need to detect such errors, use authenticated encryption such as [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md) or [`decrypt_aes_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md) instead.

### `x: string`

The string to decrypt.

The input must contain at least as many characters from the alphabet as [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md) requires: 6 with the default decimal alphabet, 5 with a hexadecimal alphabet, or 4 with a 36-character alphabet. It must contain at most 4096 characters from the alphabet. For shorter and longer values, the function returns `null` and emits a warning.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning.

### `key = secret`

The key that encrypted the value, as a secret.

The key size selects the AES variant: 16 bytes for AES-128, 24 bytes for AES-192, and 32 bytes for AES-256. A key of any other size is an error when the pipeline starts.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds the key in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `key=secret("pii-key").decode_hex()`.

### `alphabet = string (optional)`

The characters of the numeral system, in order. The length of the alphabet is the radix. The alphabet must consist of at least 2 unique ASCII characters and must match the alphabet used during encryption.

Defaults to `"0123456789"`.

### `tweak = blob|string (optional)`

The tweak that was passed during encryption. The value can differ per event. If the tweak is `null`, the function returns `null` and emits a warning.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret      | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| `pii-key`   | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` |
| `other-key` | `1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100` |

### Decrypt card numbers

```tql
let $key = secret("pii-key").decode_hex()
from {card: "3480-5050-4367-0686"}, {card: "1121 9036 2627 4592"}
card = decrypt_ff1(card, key=$key)
```

```tql
{
  card: "4111-1111-1111-1111",
}
{
  card: "5500 0000 0000 0004",
}
```

### Restore Luhn-valid card numbers

Reverse the Luhn-valid encryption from the example of [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md): decrypt the number without its check digit and append the check digit of the result:

```tql
let $key = secret("pii-key").decode_hex()
from {card: "9684338133581379"}
// Only touch card numbers: 12 to 19 digits with a valid check digit.
if card.is_luhn_valid() and card.length_bytes() >= 12 and card.length_bytes() <= 19 {
  // Decrypt all digits except for the check digit at the end.
  card = card.slice(end=-1).decrypt_ff1(key=$key, tweak="card")
  // Append the check digit that matches the decrypted digits.
  card = card + card.luhn_check_digit().string()
}
```

```tql
{
  card: "4111111111111111",
}
```

Decryption recomputes the check digit, so this round trip restores only card numbers that were valid before encryption. The guard can’t tell encrypted card numbers from clear-text ones, because both pass it, so decrypt only fields that hold encrypted values.

### Decrypt with a tweak

Pass the same tweak as during encryption, here the field name:

```tql
let $key = secret("pii-key").decode_hex()
from {phone: "8082941606", account: "7867704821"}
phone = decrypt_ff1(phone, key=$key, tweak="phone")
account = decrypt_ff1(account, key=$key, tweak="account")
```

```tql
{
  phone: "5551234567",
  account: "5551234567",
}
```

### Decrypt hexadecimal values

Pass the alphabet that was used during encryption:

```tql
let $key = secret("pii-key").decode_hex()
from {session: "b9457edbff"}
session = decrypt_ff1(session, key=$key, alphabet="0123456789abcdef")
```

```tql
{
  session: "deadbeef00",
}
```

### Recognize the effect of a wrong key or tweak

A wrong key or tweak doesn’t cause an error. The function returns a different value of the same format:

```tql
let $key = secret("pii-key").decode_hex()
let $other_key = secret("other-key").decode_hex()
from {card: "3480-5050-4367-0686"}
right_key = decrypt_ff1(card, key=$key)
wrong_key = decrypt_ff1(card, key=$other_key)
wrong_tweak = decrypt_ff1(card, key=$key, tweak="card")
```

```tql
{
  card: "3480-5050-4367-0686",
  right_key: "4111-1111-1111-1111",
  wrong_key: "1533-2603-7199-7609",
  wrong_tweak: "2608-7112-9487-4453",
}
```

## See Also

* [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)
* [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md)
* [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md)
* [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md)
* [`decrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm.md)
* [`decrypt_aes_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md)
* [`decrypt_hpke`](https://tenzir.com/docs/reference/functions/decrypt_hpke.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
