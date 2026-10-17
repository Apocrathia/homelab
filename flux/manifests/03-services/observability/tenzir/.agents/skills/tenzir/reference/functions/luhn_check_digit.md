---
title: "luhn_check_digit"
canonical: https://tenzir.com/docs/reference/functions/luhn_check_digit
source: https://tenzir.com/docs/reference/functions/luhn_check_digit.md
section: "Docs"
---

# luhn_check_digit

> Computes the Luhn check digit of a string of digits.

Computes the Luhn check digit of a string of digits.

```tql
luhn_check_digit(x:string) -> int
```

## Description

The `luhn_check_digit` function returns the digit from 0 to 9 that makes `x` pass the Luhn checksum of ISO/IEC 7812-1 when appended to it. Appending the digit turns a number without its check digit into a number that passes [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md).

The main use is to keep card numbers valid after format-preserving encryption. The [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md) function preserves the length and the digits of a card number, but not its check digit. Encrypt the number without its check digit and append a new one to get a valid card number, as the example below shows.

### `x: string`

The number without its check digit, as a string of the digits `0` to `9`.

For empty strings and strings with any other characters, such as spaces or dashes, the function returns `null` and emits a warning. Remove separators before calling the function.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret    | Value                                                              |
| --------- | ------------------------------------------------------------------ |
| `pii-key` | `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f` |

### Compute a check digit

```tql
from {x: luhn_check_digit("7992739871")}
```

```tql
{x: 3}
```

### Append a check digit

Convert the digit with [`string`](https://tenzir.com/docs/reference/functions/string.md) and append it with `+`:

```tql
from {payload: "411111111111111"}
card = payload + payload.luhn_check_digit().string()
```

```tql
{
  payload: "411111111111111",
  card: "4111111111111111",
}
```

Prefer `+` over a format string: when the function returns `null`, the `+` operator also returns `null`, while a format string appends the text `null`.

### Encrypt card numbers and keep them valid

Encrypt the card number without its check digit with [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md), and then append the check digit of the result:

```tql
let $key = secret("pii-key").decode_hex()
from {card: "4111111111111111"}, {card: "5555555555554444"}
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
  card: "5271310463352629",
}
```

Decrypt the same way with [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md):

```tql
let $key = secret("pii-key").decode_hex()
from {card: "9684338133581379"}, {card: "5271310463352629"}
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
{
  card: "5555555555554444",
}
```

Decryption recomputes the check digit, so the round trip restores only valid card numbers. The guard leaves values that fail it unchanged in both directions. It can’t tell encrypted card numbers from clear-text ones, because both pass it, so decrypt only fields that hold encrypted values. The encryption also changes the leading digits that identify the card issuer. Our guide on [keeping card numbers valid](../../guides/protect/encrypt-sensitive-data.md#keep-card-numbers-valid) shows how to keep them.

## See Also

* [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md)
* [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)
* [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
