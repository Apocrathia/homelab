---
title: "Mask sensitive data"
canonical: https://tenzir.com/docs/guides/protect/mask-sensitive-data
source: https://tenzir.com/docs/guides/protect/mask-sensitive-data.md
section: "Docs"
---

# Mask sensitive data

> This guide shows you how to mask sensitive fields such as IP addresses, email addresses, account identifiers, and credentials. You’ll learn when to anonymize, hash, redact, or partially reveal a value, and how to combine TQL functions to apply each pattern consistently across your pipelines.

This guide shows you how to mask sensitive fields such as IP addresses, email addresses, account identifiers, and credentials. You’ll learn when to anonymize, hash, redact, or partially reveal a value, and how to combine TQL functions to apply each pattern consistently across your pipelines.

Pick the technique that matches the downstream use case:

* **Anonymize** when you want to keep structural properties of the value, for example to preserve subnet relationships across IP addresses.
* **Hash** when you need a stable, irreversible identifier so the same input always maps to the same opaque output.
* **Redact** when the value must not leave the pipeline in any recoverable form.
* **Partially reveal** when an operator or analyst needs enough context to recognize a record without seeing the full value.

When authorized people must be able to recover the original value, encrypt it instead. Our guide on [encrypting sensitive data](encrypt-sensitive-data.md) covers this case.

The strongest mask is no field at all. When a sensitive field has no downstream use, drop it instead of transforming it with [`drop`](https://tenzir.com/docs/reference/operators/drop.md) or by omitting it from [`select`](https://tenzir.com/docs/reference/operators/select.md):

```tql
drop password, ssn
```

The rest of this guide covers the cases where you do need to keep something.

## Anonymize IP addresses

Use [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md) to replace IP addresses with prefix-preserving pseudonyms. Two addresses in the same subnet produce two anonymized addresses in the same subnet, which keeps flow analysis meaningful while removing the original IPs.

The seed is a secret with 32 bytes. This example assumes that your secret store holds the secret `cryptopan-key` with the hex-encoded value `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`:

```tql
let $seed = secret("cryptopan-key").decode_hex()
from {client_ip: 192.168.1.100, server_ip: 8.8.8.8, peer_ip: 192.168.1.42}
client_ip = client_ip.encrypt_cryptopan(seed=$seed)
server_ip = server_ip.encrypt_cryptopan(seed=$seed)
peer_ip = peer_ip.encrypt_cryptopan(seed=$seed)
```

```tql
{
  client_ip: 2.149.252.148,
  server_ip: 245.155.245.195,
  peer_ip: 2.149.252.239,
}
```

The two addresses originally in `192.168.1.0/24` still share a prefix (`2.149.252.0/24`) after anonymization, while `8.8.8.8` ends up in an unrelated range. Because the seed comes from your secret store, it never appears in the pipeline definition.

Crypto-PAn is reversible

Crypto-PAn is a keyed pseudonymization scheme, not a one-way function. Anyone with the seed can recover the original addresses with [`decrypt_cryptopan`](https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md). Treat the seed like a private key: keep it in your secret store, and use [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md) instead if you need an irreversible transformation.

When an authorized investigator needs to round-trip an event back to its original IPs, pass the same seed to [`decrypt_cryptopan`](https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md):

```tql
let $seed = secret("cryptopan-key").decode_hex()
from {client_ip: 2.149.252.148, server_ip: 245.155.245.195, peer_ip: 2.149.252.239}
client_ip = client_ip.decrypt_cryptopan(seed=$seed)
server_ip = server_ip.decrypt_cryptopan(seed=$seed)
peer_ip = peer_ip.decrypt_cryptopan(seed=$seed)
```

```tql
{
  client_ip: 192.168.1.100,
  server_ip: 8.8.8.8,
  peer_ip: 192.168.1.42,
}
```

## Hash sensitive fields

Use a cryptographic hash to turn a value into a stable, irreversible token. The same input always produces the same output, which lets you correlate events without exposing the original data.

```tql
from {
  user: "alice",
  email: "alice@example.com",
  account_id: "A-19483",
}
email = email.hash_sha256()
account_id = account_id.hash_sha256()
```

```tql
{
  user: "alice",
  email: "ff8d9819fc0e12bf0d24892e45987e249a28dce836a85cad60e28eaaa8c6d976",
  account_id: "b680734b648f3c329b87f4785db0644f66d9d4d4280e2c091d5daa20c01ed0b8",
}
```

[`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md) works for any string and produces a 64-character hex digest. Tenzir ships several hash functions so you can pick the right trade-off between speed and collision resistance:

* SHA-2 family: [`hash_sha224`](https://tenzir.com/docs/reference/functions/hash_sha224.md), [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md), [`hash_sha384`](https://tenzir.com/docs/reference/functions/hash_sha384.md), [`hash_sha512`](https://tenzir.com/docs/reference/functions/hash_sha512.md)
* SHA-3 family: [`hash_sha3_224`](https://tenzir.com/docs/reference/functions/hash_sha3_224.md), [`hash_sha3_256`](https://tenzir.com/docs/reference/functions/hash_sha3_256.md), [`hash_sha3_384`](https://tenzir.com/docs/reference/functions/hash_sha3_384.md), [`hash_sha3_512`](https://tenzir.com/docs/reference/functions/hash_sha3_512.md)
* Legacy (not cryptographically secure): [`hash_md5`](https://tenzir.com/docs/reference/functions/hash_md5.md), [`hash_sha1`](https://tenzir.com/docs/reference/functions/hash_sha1.md)
* Fast non-cryptographic: [`hash_xxh3`](https://tenzir.com/docs/reference/functions/hash_xxh3.md) for high-throughput deduplication or sharding

Two properties of hashing to keep in mind

* The same input always yields the same digest, so an attacker with a list of candidate values can confirm matches. Add a secret salt for fields with low entropy.
* Hashing is one-way. Once a field is hashed, you can no longer recover the original value from the event.

### Salt low-entropy values

For values from a small or guessable domain, such as phone numbers or short account IDs, pass a secret `seed` to the hash function. Every hash function listed earlier accepts the same `seed` argument:

```tql
let $salt = "some-random-string"
from {phone: "555-123-4567"}
phone = phone.hash_sha256(seed=$salt)
```

```tql
{
  phone: "3165fcc6f2ce36dd14e56b451142d5188eed5e2f1e2dafec1e34c1e573438afe",
}
```

A different seed produces a completely different digest for the same input, so keeping the salt secret defeats any pre-computed rainbow tables an attacker may hold.

### Authenticate with HMAC

When compliance language asks for HMAC-SHA256 specifically, or when you need the formal guarantees of a keyed message authentication code, use [`hmac`](https://tenzir.com/docs/reference/functions/hmac.md). Its key is a secret, so it never appears in the pipeline definition. This example assumes that your secret store holds the secret `hmac-key` with the value `some-random-string`:

```tql
from {
  user: "alice",
  email: "alice@example.com",
}
email = hmac(email, secret("hmac-key"))
```

```tql
{
  user: "alice",
  email: "349aca5c07a66d0970bf1fc97326b5f9c2c3d15155ea4be90fbe88f628aa7e6e",
}
```

The `hmac` function defaults to SHA-256 and accepts `algorithm="sha512"`, `"sha384"`, `"sha1"`, or `"md5"`.

## Redact values with a fixed mask

When the original value must not survive the pipeline at all, overwrite the field with a constant:

```tql
from {
  user: "alice",
  password: "hunter2",
  api_key: "sk-live-9f8a3c2b1d0e",
}
password = "******"
api_key = "******"
```

```tql
{
  user: "alice",
  password: "******",
  api_key: "******",
}
```

The mask is unrelated to the input, so the original value is unrecoverable and two distinct values become indistinguishable in the output. Use this pattern for credentials and any value you never want to correlate again.

Assigning to a field unconditionally also creates it on records that did not have it. To redact only when the field is already present, guard the assignment with an `if` block:

```tql
if password? != null {
  password = "******"
}
```

Records without a `password` field pass through unchanged.

### Redact a structured value from raw data

Normalized events can retain a sensitive value in both a structured field and the original `raw_data`. Use the structured field as the dynamic pattern for [`replace`](https://tenzir.com/docs/reference/functions/replace.md) before you overwrite it:

```tql
from {
  raw_data: "Authentication succeeded for alice@example.com",
  user: {email_addr: "alice@example.com"},
}


raw_data = raw_data.replace(user.email_addr, "***")
user.email_addr = "***"
```

```tql
{
  raw_data: "Authentication succeeded for ***",
  user: {email_addr: "***"},
}
```

The order matters because the first assignment uses the original `user.email_addr` as its pattern. After the replacement, you can mask the structured field without leaving the email address in `raw_data`.

## Reveal a prefix and mask the rest

Sometimes you want analysts to recognize a value at a glance without exposing all of it. Combine [`slice`](https://tenzir.com/docs/reference/functions/slice.md) with [`pad_end`](https://tenzir.com/docs/reference/functions/pad_end.md) or [`pad_start`](https://tenzir.com/docs/reference/functions/pad_start.md) to keep either end of the value:

```tql
from {
  account_id: "ACME-19483-PROD",
  card_number: "4111111111111111",
}
account_id = account_id.slice(end=4).pad_end(8, "*")
card_number = card_number.slice(begin=-4).pad_start(16, "*")
```

```tql
{
  account_id: "ACME****",
  card_number: "************1111",
}
```

For `account_id`, `slice(end=4)` takes the first four characters and `pad_end(8, "*")` extends the result to eight characters with `*`.

For `card_number`, `slice(begin=-4)` takes the last four digits and `pad_start(16, "*")` prepends twelve `*` characters to match the original length. This is the conventional display format for payment card numbers. Adjust the slice offsets and pad lengths to control how much of the value stays visible.

### Mask only valid card numbers

A field such as a payment reference can hold card numbers next to other identifiers that you want to keep. Use [`is_luhn_valid`](https://tenzir.com/docs/reference/functions/is_luhn_valid.md) to mask only the values that pass the Luhn check of card numbers:

```tql
from {payment_ref: "4111111111111111"},
     {payment_ref: "378282246310005"},
     {payment_ref: "ORD-2024-0042"}
if payment_ref.is_luhn_valid() {
  payment_ref = payment_ref.slice(begin=-4).pad_start(payment_ref.length_bytes(), "*")
}
```

```tql
{payment_ref: "************1111"}
{payment_ref: "***********0005"}
{payment_ref: "ORD-2024-0042"}
```

Padding to the length of each value keeps the 15 digits of the American Express number in the second event.

The check is necessary but not sufficient for a card number: one in ten random strings of digits passes it. When a field can hold other numbers, combine the check with further conditions, such as the expected length. Conversely, a mistyped card number fails the check and stays unmasked, so add an `else` branch when no such value may leave the pipeline.

## Mask parts of an email address

Email addresses have structure you can exploit. Sometimes you want to hide who the user is but keep the provider visible for analytics; other times you want just enough of both parts for an analyst to recognize a record.

### Mask the local part, keep the domain

Split on `@` and rebuild the address with a fixed mask for the local part:

```tql
from {email: "alice@example.com"},
     {email: "bob@mail.tenzir.com"},
     {email: "carol.smith@acme.co.uk"}
email = f"*****@{email.split("@")[1]}"
```

```tql
{email: "*****@example.com"}
{email: "*****@mail.tenzir.com"}
{email: "*****@acme.co.uk"}
```

The domain stays intact, so you can still group events by provider while the identifying portion is gone.

### Reveal one character of each part

For a display-friendly format, use [`replace_regex`](https://tenzir.com/docs/reference/functions/replace_regex.md) with capture groups to keep the first character of the local part and the first character of the host:

```tql
from {email: "alice@example.com"},
     {email: "bob@mail.tenzir.com"},
     {email: "carol.smith@acme.co.uk"}
email = email.replace_regex(r"([^@])[^@]*@([^.])[^.]*\.(.+)", r"\1****@\2****.\3")
```

```tql
{email: "a****@e****.com"}
{email: "b****@m****.tenzir.com"}
{email: "c****@a****.co.uk"}
```

The pattern captures the first character of the local part (`\1`), the first character of the host name (`\2`), and the remaining TLD components (`\3`), then surrounds each captured character with a fixed `****` mask. Multi-label TLDs like `co.uk` and subdomains like `mail.tenzir.com` are preserved because `\3` matches everything after the first dot in the domain.

## Coarsen dates and timestamps

For fields like date of birth or login time, you often want to keep the year or month but drop finer granularity. Combine [`format_time`](https://tenzir.com/docs/reference/functions/format_time.md) with the [`time`](https://tenzir.com/docs/reference/functions/time.md) constructor to rebuild a `time` value pinned to the start of a period, which preserves the type for downstream filtering and aggregation:

```tql
from {
  user: "alice",
  dob: 1985-07-23T00:00:00,
  last_login: 2024-06-15T14:30:45,
}
dob = dob.format_time("%Y-01-01").time()
last_login = last_login.format_time("%Y-%m-01").time()
```

```tql
{
  user: "alice",
  dob: 1985-01-01T00:00:00Z,
  last_login: 2024-06-01T00:00:00Z,
}
```

The pipeline reduces `dob` to year precision and `last_login` to month precision. Adjust the format string to keep the day (`"%Y-%m-%d"`) or to truncate further by hard-coding earlier components.

If you only need the year as a number, for example to compute age cohorts, call [`year`](https://tenzir.com/docs/reference/functions/year.md) directly:

```tql
from {dob: 1985-07-23T00:00:00}
birth_year = dob.year()
```

```tql
{
  dob: 1985-07-23T00:00:00Z,
  birth_year: 1985,
}
```

For a string label such as `"1985"`, use [`format_time`](https://tenzir.com/docs/reference/functions/format_time.md) with `"%Y"`.

Salts of hash functions

The key of [`hmac`](https://tenzir.com/docs/reference/functions/hmac.md), the seeds of [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md) and [`decrypt_cryptopan`](https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md), and the keys of the [encryption functions](encrypt-sensitive-data.md) accept secrets, which keeps them out of the pipeline definition. The `seed` arguments of the `hash_*` functions accept only plain strings. Source salts through your deployment’s secret-injection mechanism, such as environment variables populated from a secret store, and bind them with `let`.

## See also

* [`drop`](https://tenzir.com/docs/reference/operators/drop.md)
* [`select`](https://tenzir.com/docs/reference/operators/select.md)
* [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md)
* [`decrypt_cryptopan`](https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md)
* [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md)
* [`hmac`](https://tenzir.com/docs/reference/functions/hmac.md)
* [`slice`](https://tenzir.com/docs/reference/functions/slice.md)
* [`pad_end`](https://tenzir.com/docs/reference/functions/pad_end.md)
* [`pad_start`](https://tenzir.com/docs/reference/functions/pad_start.md)
* [`replace`](https://tenzir.com/docs/reference/functions/replace.md)
* [`replace_regex`](https://tenzir.com/docs/reference/functions/replace_regex.md)
* [`year`](https://tenzir.com/docs/reference/functions/year.md)
* [`format_time`](https://tenzir.com/docs/reference/functions/format_time.md)
* [`secret`](https://tenzir.com/docs/reference/functions/secret.md)
* [Manipulate strings](../shape/manipulate-strings.md)
* [Transform values](../shape/transform-values.md)
* [Normalize event timestamps](../shape/normalize-event-timestamps.md)
* [Encrypt sensitive data](encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
* [Secrets](../../explanations/secrets.md)
