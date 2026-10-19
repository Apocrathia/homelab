---
title: "is_luhn_valid"
canonical: https://tenzir.com/docs/reference/functions/is_luhn_valid
source: https://tenzir.com/docs/reference/functions/is_luhn_valid.md
section: "Docs"
---

# is_luhn_valid

> Checks if a string of digits has a valid Luhn checksum.

Checks if a string of digits has a valid Luhn checksum.

```tql
is_luhn_valid(x:string) -> bool
```

## Description

The `is_luhn_valid` function returns `true` if `x` consists of the digits `0` to `9` and passes the Luhn checksum of ISO/IEC 7812-1, and `false` otherwise. Most payment card numbers, IMEI numbers, and some national identifiers end in a Luhn check digit, which detects every single mistyped digit and most swaps of adjacent digits.

The function only tests the checksum. It doesn’t check the length, the issuer, or whether the number exists. A valid checksum is therefore necessary but not sufficient for a valid card number: one in ten random strings of digits passes the check.

### `x: string`

The string to check.

The function doesn’t remove separators. It returns `false` for empty strings and for strings with any other characters, such as spaces, dashes, or digits of other scripts. To check a formatted number, remove its separators first.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning.

## Examples

### Check card numbers

```tql
from {card: "4111111111111111"}, {card: "4111111111111112"}
valid = card.is_luhn_valid()
```

```tql
{
  card: "4111111111111111",
  valid: true,
}
{
  card: "4111111111111112",
  valid: false,
}
```

### Check formatted card numbers

Remove spaces and dashes with [`replace_regex`](https://tenzir.com/docs/reference/functions/replace_regex.md) before the check:

```tql
from {card: "4111-1111-1111-1111"}
formatted = card.is_luhn_valid()
digits = card.replace_regex("[ -]", "").is_luhn_valid()
```

```tql
{
  card: "4111-1111-1111-1111",
  formatted: false,
  digits: true,
}
```

### Mask only valid card numbers

Use the function as a guard, so that a pipeline masks card numbers and leaves other values alone:

```tql
from {payment_ref: "4111111111111111"},
     {payment_ref: "4111111111111112"},
     {payment_ref: "ORD-2024-0042"}
if payment_ref.is_luhn_valid() {
  payment_ref = payment_ref.slice(begin=-4).pad_start(payment_ref.length_bytes(), "*")
}
```

```tql
{
  payment_ref: "************1111",
}
{
  payment_ref: "4111111111111112",
}
{
  payment_ref: "ORD-2024-0042",
}
```

## See Also

* [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md)
* [`is_numeric`](https://tenzir.com/docs/reference/functions/is_numeric.md)
* [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
