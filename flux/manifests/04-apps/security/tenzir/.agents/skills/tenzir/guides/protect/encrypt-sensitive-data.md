---
title: "Encrypt sensitive data"
canonical: https://tenzir.com/docs/guides/protect/encrypt-sensitive-data
source: https://tenzir.com/docs/guides/protect/encrypt-sensitive-data.md
section: "Docs"
---

# Encrypt sensitive data

> This guide shows you how to encrypt sensitive fields so that authorized people can recover them later. You’ll learn how to manage keys, encrypt and decrypt fields, keep encrypted values usable for analytics, preserve value formats, and encrypt data that only the holder of a private key can read.

This guide shows you how to encrypt sensitive fields so that authorized people can recover them later. You’ll learn how to manage keys, encrypt and decrypt fields, keep encrypted values usable for analytics, preserve value formats, and encrypt data that only the holder of a private key can read.

Encrypt a field when someone may need the original value again, for example to re-identify a user during an investigation. When nobody ever needs the original, [mask it](mask-sensitive-data.md) instead.

Pick the function that matches what the encrypted data must still allow:

| Requirement                                  | Function                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Recover values later                         | [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md) |
| Group, join, or count by the encrypted value | [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)         |
| Keep the format of the value                 | [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)                 |
| Encrypt without being able to decrypt        | [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)               |
| Exchange data with AES-GCM tools             | [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)         |

Our explanation of [encryption](../../explanations/encryption.md) describes the trade-offs behind these choices in detail.

## Manage keys

Encryption is only as strong as the protection of its keys. Generate random keys, keep them in a secret store, and load them into pipelines with the [`secret`](https://tenzir.com/docs/reference/functions/secret.md) function.

### Create a symmetric key

The AES and FF1 functions use symmetric keys: the same key encrypts and decrypts. Generate a random 32-byte key for AES-256 in hexadecimal:

```sh
openssl rand -hex 32
```

[`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md) combines two AES keys and therefore needs a 64-byte key:

```sh
openssl rand -hex 64
```

Store the key in your secret store, for example under the name `pii-key`. Reading it with [`secret`](https://tenzir.com/docs/reference/functions/secret.md) keeps the key out of pipeline definitions. The functions expect raw key bytes, so decode the hexadecimal text when you load it:

```tql
let $key = secret("pii-key").decode_hex()
```

The examples in this guide assume that your secret store holds the following secrets:

| Secret        | Value                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pii-key`     | `8f7a1c3e5b9d2f4a6c8e0b1d3f5a7c9e2b4d6f8a0c1e3b5d7f9a2c4e6b8d0f1a`                                                                 |
| `pii-siv-key` | `5ab47298e109d75d1e41a8d0e506076b2770ea29b2b48fe15d8df97c9e7e784e655585dc29105bf197d7d63a5d3f9afd886ca11b53d999cf6e7ea6070ed632ae` |
| `pii-ff1-key` | `de7708de988a0fec13679fea0efb86385ab83fcf99652fea15b035e51a7d42e9`                                                                 |

Use a separate key for each function and data set, as our explanation of [encryption](../../explanations/encryption.md#keys) recommends. The examples follow this practice: `pii-key` for AES-GCM-SIV, `pii-siv-key` for AES-SIV, and `pii-ff1-key` for FF1.

### Create a key pair

[`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md) uses a key pair instead. Generate an X25519 private key and derive its public key:

```sh
openssl genpkey -algorithm X25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
```

The public key doesn’t need to stay confidential, but it must not be replaced. Anyone who can swap it for their own key can read everything that the pipelines encrypt from then on, while the intended recipient can’t. Deploy the public key to the pipelines that encrypt in a way that only administrators can change, for example as a read-only file from your configuration management. Keep the private key in a secret store that only the pipelines that decrypt can access.

## Encrypt fields for later recovery

Use [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md) to encrypt a field so that only key holders can read it:

```tql
let $key = secret("pii-key").decode_hex()
from {user: "alice", email: "alice@example.com", action: "login"}
email = email.encrypt_aes_gcm_siv(key=$key)
write_json
```

```json
{
  "user": "alice",
  "email": "Fbj2XD1chRlUUVDllgnT5Pi1ZYyCkqlYNfAH4c+mIIsGDUC5sanRG497xYNQ",
  "action": "login"
}
```

The function returns a `blob` that holds a random nonce, the ciphertext, and an authentication tag. JSON renders blobs as Base64. The output differs on every run, because every value gets a fresh random nonce. As a result, the ciphertext hides whether two events contain the same email address.

## Decrypt fields

Pass the same key to the matching decryption function. When the encrypted value arrives as Base64, for example after a round trip through JSON, decode it first. The decryption returns a `blob`, which [`string`](https://tenzir.com/docs/reference/functions/string.md) turns back into text:

```tql
let $key = secret("pii-key").decode_hex()
from {
  user: "alice",
  email: "Fbj2XD1chRlUUVDllgnT5Pi1ZYyCkqlYNfAH4c+mIIsGDUC5sanRG497xYNQ",
  action: "login",
}
email = email.decode_base64().decrypt_aes_gcm_siv(key=$key).string()
```

```tql
{
  user: "alice",
  email: "alice@example.com",
  action: "login",
}
```

If the key does not match, or if someone modified the ciphertext, the decryption returns `null` and emits a warning.

## Keep equal values equal

Randomized encryption hides equality, which prevents grouping by the encrypted field. When analysts need to count events per user without seeing the user, use [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md). It encrypts deterministically, so the same user always maps to the same ciphertext:

```tql
let $key = secret("pii-siv-key").decode_hex()
from {user: "alice", action: "login"},
     {user: "bob", action: "login"},
     {user: "alice", action: "logout"}
user = user.encrypt_aes_siv(key=$key, aad="user").encode_hex()
summarize user, events=count()
sort user
```

```tql
{
  user: "412F87DAFF44431AA29E2C9030F0D36499E92B",
  events: 1,
}
{
  user: "C12E0DE83B753660AFFEA83FF3E4329CB73D883ABC",
  events: 2,
}
```

Passing the field name as associated data with `aad="user"` makes the same value encrypt differently in different fields. [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md) turns the ciphertext into a string that is easy to display and compare.

Deterministic encryption reveals frequencies

Equal ciphertexts reveal how often each value occurs. For fields with few distinct values, such as a country or a status code, the frequencies alone often give away the plaintext. Use deterministic encryption only for identifiers with many distinct values.

## Preserve the format of values

Some downstream systems validate the shape of a field, for example a column that accepts only 16-digit card numbers. Use [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md) to encrypt a value into another value of the same length and alphabet. Characters outside the alphabet, such as dashes and spaces, stay in place:

```tql
let $key = secret("pii-ff1-key").decode_hex()
from {card: "4111-1111-1111-1111", phone: "+1 555 123 4567"}
card = card.encrypt_ff1(key=$key, tweak="card")
phone = phone.encrypt_ff1(key=$key, tweak="phone")
```

```tql
{
  card: "1424-9180-0633-1645",
  phone: "+2 205 119 0587",
}
```

The default alphabet consists of the ten decimal digits. Pass `alphabet` for other formats, for example `alphabet="0123456789abcdef"` for hexadecimal identifiers. The `tweak` works like associated data and makes the same digits encrypt differently in different fields.

Decrypt with [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md) and the same key, alphabet, and tweak:

```tql
let $key = secret("pii-ff1-key").decode_hex()
from {card: "1424-9180-0633-1645", phone: "+2 205 119 0587"}
card = card.decrypt_ff1(key=$key, tweak="card")
phone = phone.decrypt_ff1(key=$key, tweak="phone")
```

```tql
{
  card: "4111-1111-1111-1111",
  phone: "+1 555 123 4567",
}
```

FF1 needs at least one million possible values, which means at least six digits with the default alphabet, and accepts at most 4096 characters from the alphabet. Shorter and longer values become `null` with a warning. FF1 also cannot detect a wrong key: decrypting with the wrong key or tweak returns a different value of the same format.

### Keep card numbers valid

FF1 preserves the length and the alphabet, not checksums. An encrypted card number usually fails the Luhn check, so a system that validates the check digit rejects it. The encrypted card number in the first example, `1424-9180-0633-1645`, fails the check.

To keep a card number valid, encrypt it without its check digit and append the check digit of the result with [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md). Guard the assignments with [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md) and a length check so that they apply only to card numbers, which have 12 to 19 digits. Without the length check, a short value that happens to pass the Luhn check, such as `42`, leaves too few digits for FF1 and becomes `null`:

```tql
let $key = secret("pii-ff1-key").decode_hex()
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
  card: "6513398807728030",
}
{
  card: "5774853797824492",
}
```

Decrypt the same way with [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md):

```tql
let $key = secret("pii-ff1-key").decode_hex()
from {card: "6513398807728030"}, {card: "5774853797824492"}
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

Decryption recomputes the check digit instead of restoring it, so the round trip restores only card numbers that were valid before encryption. With the guard in both directions, other values pass through unchanged instead. The guard can’t tell encrypted card numbers from clear-text ones, because both pass it, so decrypt only fields that hold encrypted values. The check accepts only digits, so remove separators first, for example with `card.replace_regex("[ -]", "")`.

The encryption also replaces the leading digits that identify the card issuer, so `4111111111111111` becomes `6513398807728030`. If a downstream system checks the issuer, keep the issuer identification number in clear text and encrypt only the digits between it and the check digit. ISO/IEC 7812-1:2017 extended issuer identification numbers from six to eight digits, and a card number does not reveal which length its issuer uses. Keep eight digits to cover both:

```tql
let $key = secret("pii-ff1-key").decode_hex()
from {card: "4111111111111111"}
// Only touch card numbers: 12 to 19 digits with a valid check digit.
if card.is_luhn_valid() and card.length_bytes() >= 12 and card.length_bytes() <= 19 {
  // Keep the first eight digits and encrypt the rest, except for the
  // check digit at the end.
  card = card.slice(end=8) + card.slice(begin=8, end=-1).encrypt_ff1(key=$key, tweak="card")
  // Append the check digit that matches the encrypted digits.
  card = card + card.luhn_check_digit().string()
}
```

```tql
{
  card: "4111111186776988",
}
```

Decrypt with the same slices and [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md). The clear-text digits reduce what the encryption hides: a 16-digit card number keeps only seven encrypted digits. FF1 needs at least six, so card numbers with fewer than 15 digits become `null` with a warning. If the downstream system checks only six digits, slice at 6 instead. This encrypts two more digits and works for card numbers with at least 13 digits.

Values that fail the guard stay in clear text, including card numbers without a Luhn check digit, such as some China UnionPay cards. If they must not leave the pipeline, handle them in an `else` branch, for example by masking them as our guide on [masking only valid card numbers](mask-sensitive-data.md#mask-only-valid-card-numbers) shows.

## Encrypt for a recipient

With symmetric keys, every pipeline that encrypts can also decrypt. When pipelines at the edge should protect data without being able to decrypt it, use [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md) with the recipient’s public key:

```tql
let $public_key = file_contents("/etc/tenzir/keys/public.pem")
subscribe "logins"
user.email = user.email.encrypt_hpke(public_key=$public_key)
publish "logins-protected"
```

Only a pipeline with the private key can decrypt the values, for example when an investigator needs to re-identify a user:

```tql
let $private_key = secret("hpke-private-key")
subscribe "logins-protected"
user.email = user.email.decrypt_hpke(private_key=$private_key).string()
```

Every value requires a key agreement, which makes HPKE about 100 times slower than the AES functions. Encrypt selected fields with it rather than entire events.

## Bind ciphertexts to their context

Associated data ties a ciphertext to the event that it belongs to. The functions authenticate the associated data together with the ciphertext, and decryption succeeds only with the same value. This stops someone from copying an encrypted value from one tenant’s events into another’s:

```tql
let $key = secret("pii-key").decode_hex()
from {tenant: "acme", email: "alice@acme.com"}
email = email.encrypt_aes_gcm_siv(key=$key, aad=tenant)
tenant = "globex"
email = email.decrypt_aes_gcm_siv(key=$key, aad=tenant)
```

```tql
{
  tenant: "globex",
  email: null,
}
```

The decryption fails because the event claims a different tenant than the one the value was encrypted for. The associated data is not part of the ciphertext, so the event must carry it in plain text, or the decrypting pipeline must know it otherwise.

When the associated data is `null`, for example because an event lacks the tenant field, the functions return `null` and emit a warning. Use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else) to fall back to an empty value, as in `aad=tenant? else ""`.

## Encrypt records

The encryption functions take strings and blobs. To encrypt a record or a list, serialize it with [`print_json`](https://tenzir.com/docs/reference/functions/print_json.md) first, and parse it with [`parse_json`](https://tenzir.com/docs/reference/functions/parse_json.md) after decrypting:

```tql
let $key = secret("pii-key").decode_hex()
from {user: {name: "alice", email: "alice@example.com", roles: ["admin"]}, action: "login"}
user = user.print_json().encrypt_aes_gcm_siv(key=$key)
user = user.decrypt_aes_gcm_siv(key=$key).string().parse_json()
```

```tql
{
  user: {
    name: "alice",
    email: "alice@example.com",
    roles: [
      "admin",
    ],
  },
  action: "login",
}
```

## Rotate keys

A ciphertext does not identify the key that encrypted it. To rotate keys without losing access to older data, store a key identifier next to the encrypted value:

```tql
let $key = secret("pii-key-2026").decode_hex()
subscribe "logins"
user.email = user.email.encrypt_aes_gcm_siv(key=$key)
key_id = "2026"
publish "logins-protected"
```

When you decrypt, select the key by its identifier:

```tql
let $key_2025 = secret("pii-key-2025").decode_hex()
let $key_2026 = secret("pii-key-2026").decode_hex()
subscribe "logins-protected"
if key_id == "2025" {
  user.email = user.email.decrypt_aes_gcm_siv(key=$key_2025)
} else {
  user.email = user.email.decrypt_aes_gcm_siv(key=$key_2026)
}
user.email = user.email.string()
```

Keep old keys available until no data encrypted with them remains.

## See also

* [Mask sensitive data](mask-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
* [Secrets](../../explanations/secrets.md)
