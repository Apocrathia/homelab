---
title: "encrypt_ff1"
canonical: https://tenzir.com/docs/reference/functions/encrypt_ff1
source: https://tenzir.com/docs/reference/functions/encrypt_ff1.md
section: "Docs"
---

# encrypt_ff1

> Encrypts a string with format-preserving encryption (FF1).

Encrypts a string with format-preserving encryption (FF1).

```tql
encrypt_ff1(x:string, key=secret, [alphabet=string, tweak=blob|string]) -> string
```

## Description

The `encrypt_ff1` function encrypts `x` with FF1 over AES, as specified in NIST SP 800-38G. FF1 is a format-preserving encryption mode: the output has the same length as the input and uses the same alphabet. An encrypted card number still looks like a card number, so it passes through systems that check the length and the characters. NIST’s 2025 draft revision of SP 800-38G removes FF3 and FF3-1, which leaves FF1 as the only format-preserving mode.

The function only encrypts the characters of the alphabet. All other characters pass through unchanged, so separators such as dashes and spaces stay in place.

FF1 is deterministic: the same input, key, alphabet, and tweak always produce the same output. Equal values therefore stay equal after encryption.

FF1 preserves the length and the alphabet, but not check digits, so an encrypted card number usually fails the Luhn check. To keep card numbers valid, encrypt them without their check digit and append a new one with [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md). Guard encryption and decryption with [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md) and a length check, as the example below shows.

Use [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md) to restore the original value.

FF1 does not authenticate

FF1 can’t detect a wrong key or a modified ciphertext. Decrypting with the wrong key or tweak silently returns a wrong value of the right format. Small domains also leak more information than large ones. If you don’t need to preserve the format, use [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md) or [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md) instead.

### `x: string`

The string to encrypt.

NIST requires at least one million possible values, so the input must contain enough characters from the alphabet: at least 6 with the default decimal alphabet, 5 with a hexadecimal alphabet, or 4 with a 36-character alphabet. For shorter values, the function returns `null` and emits a warning.

The cost of FF1 grows quadratically with the length of the input, so the function encrypts at most 4096 characters from the alphabet. For longer values, it returns `null` and emits a warning.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning.

### `key = secret`

The encryption key as a secret.

The key size selects the AES variant: 16 bytes for AES-128, 24 bytes for AES-192, and 32 bytes for AES-256. A key of any other size is an error when the pipeline starts.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds the key in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `key=secret("pii-key").decode_hex()`.

### `alphabet = string (optional)`

The characters of the numeral system, in order. The length of the alphabet is the radix. The alphabet must consist of at least 2 unique ASCII characters.

Defaults to `"0123456789"`.

### `tweak = blob|string (optional)`

A value that varies the output without being secret. The value can differ per event, for example the name of the field, so that equal values in different fields encrypt to different outputs.

Decryption must use the same tweak. If the tweak is `null`, the function returns `null` and emits a warning. To fall back to an empty tweak instead, use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else), for example `tweak=field? else ""`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret    | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| `pii-key` | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` |

### Encrypt card numbers

The dashes and spaces stay in place:

```tql
let $key = secret("pii-key").decode_hex()
from {card: "4111-1111-1111-1111"}, {card: "5500 0000 0000 0004"}
card = encrypt_ff1(card, key=$key)
```

```tql
{
  card: "3480-5050-4367-0686",
}
{
  card: "1121 9036 2627 4592",
}
```

### Keep card numbers Luhn-valid

Encrypt the card number without its check digit and append the check digit of the result. The guard leaves values that aren’t card numbers unchanged, including short numbers such as `42` that pass the Luhn check but have too few digits for FF1:

```tql
let $key = secret("pii-key").decode_hex()
from {card: "4111111111111111"}, {card: "42"}, {card: "n/a"}
// Only touch card numbers: 12 to 19 digits with a valid check digit.
if card.is_luhn_valid() and card.length_bytes() >= 12 and card.length_bytes() <= 19 {
  // Encrypt all digits except for the check digit at the end.
  card = card.slice(end=-1).encrypt_ff1(key=$key, tweak="card")
  // Append the check digit that matches the encrypted digits.
  card = card + card.luhn_check_digit().string()
}
```

```tql
{
  card: "9684338133581379",
}
{
  card: "42",
}
{
  card: "n/a",
}
```

### Vary the output per field with a tweak

Pass the field name as tweak so that the same value encrypts differently in different fields:

```tql
let $key = secret("pii-key").decode_hex()
from {phone: "5551234567", account: "5551234567"}
phone = encrypt_ff1(phone, key=$key, tweak="phone")
account = encrypt_ff1(account, key=$key, tweak="account")
```

```tql
{
  phone: "8082941606",
  account: "7867704821",
}
```

### Encrypt hexadecimal values

Pass a custom alphabet for values that aren’t decimal:

```tql
let $key = secret("pii-key").decode_hex()
from {session: "deadbeef00"}
session = encrypt_ff1(session, key=$key, alphabet="0123456789abcdef")
```

```tql
{
  session: "b9457edbff",
}
```

### Handle values that are too short

A 4-digit PIN has only 10,000 possible values, which is less than the minimum of one million. The function returns `null` and emits a warning:

```tql
let $key = secret("pii-key").decode_hex()
from {pin: "1234"}, {pin: "123456"}
encrypted = encrypt_ff1(pin, key=$key)
```

```tql
{
  pin: "1234",
  encrypted: null,
}
{
  pin: "123456",
  encrypted: "225524",
}
```

## See Also

* [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md)
* [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md)
* [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md)
* [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md)
* [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)
* [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)
* [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
