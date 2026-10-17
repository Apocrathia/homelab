---
title: "Encryption"
canonical: https://tenzir.com/docs/explanations/encryption
source: https://tenzir.com/docs/explanations/encryption.md
section: "Docs"
---

# Encryption

> Encryption turns a value into ciphertext that only the holders of a key can turn back into the original. In a pipeline, it protects sensitive fields before data leaves a trust boundary while keeping the option to recover them, for example when an incident responder needs the real user name behind an event.

Encryption turns a value into ciphertext that only the holders of a key can turn back into the original. In a pipeline, it protects sensitive fields before data leaves a trust boundary while keeping the option to recover them, for example when an incident responder needs the real user name behind an event.

This page explains the encryption functions of TQL, the properties that set them apart, and how to choose between them. For step-by-step instructions, see our guide on [encrypting sensitive data](../guides/protect/encrypt-sensitive-data.md).

## Encryption, hashing, and masking

Encryption is one of several ways to protect a value. They differ in whether you can recover the original, and in what the protected value still reveals:

| Technique                    | Reversible | Equal inputs stay equal | Functions                                                                                                                                                                        |
| ---------------------------- | ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redaction                    | No         | No                      | Assign a constant                                                                                                                                                                |
| Hashing                      | No         | Yes                     | [`hash_sha256`](https://tenzir.com/docs/reference/functions/hash_sha256.md), [`hmac`](https://tenzir.com/docs/reference/functions/hmac.md)                                       |
| Randomized encryption        | Yes        | No                      | [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md), [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md) |
| Deterministic encryption     | Yes        | Yes                     | [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)                                                                                              |
| Format-preserving encryption | Yes        | Yes                     | [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md), [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md)             |
| Public-key encryption        | Yes        | No                      | [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)                                                                                                    |

Hash a value when nobody ever needs the original. Encrypt it when someone authorized must be able to recover it. Our guide on [masking sensitive data](../guides/protect/mask-sensitive-data.md) covers redaction and hashing.

## The encryption functions

Every encryption function has a decryption counterpart that mirrors its arguments, with two exceptions: [`decrypt_hpke`](https://tenzir.com/docs/reference/functions/decrypt_hpke.md) takes the private key instead of the public key, and [`decrypt_cryptopan`](https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md) also accepts the address family to decrypt in.

| Functions                                                                                   | Algorithm                 | Key                    | Deterministic | Output   | Size increase   |
| ------------------------------------------------------------------------------------------- | ------------------------- | ---------------------- | ------------- | -------- | --------------- |
| [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md) | AES-GCM-SIV (RFC 8452)    | 16 or 32 bytes         | No            | `blob`   | 28 bytes        |
| [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)         | AES-GCM (NIST SP 800-38D) | 16, 24, or 32 bytes    | No            | `blob`   | 28 bytes        |
| [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)         | AES-SIV (RFC 5297)        | 32, 48, or 64 bytes    | Yes           | `blob`   | 16 bytes        |
| [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)                 | FF1 (NIST SP 800-38G)     | 16, 24, or 32 bytes    | Yes           | `string` | None            |
| [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)               | HPKE (RFC 9180)           | Public and private key | No            | `blob`   | 48 to 149 bytes |
| [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md)     | Crypto-PAn                | 32-byte seed           | Yes           | `ip`     | None            |

## Choose a function

Start from what the encrypted data must still allow:

* **Recover values later**: Use [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md). It hides everything except the length, detects tampering, and tolerates high volumes. This is the right default.
* **Group, join, or count by the encrypted value**: Use [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md). Equal values produce equal ciphertexts, so [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md), joins, and deduplication keep working without the key.
* **Keep the format**: Use [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md) when downstream systems validate the shape of a value, such as a column that only accepts digits of a fixed length. When they also verify the Luhn check digit of card numbers, append a new one with [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md).
* **Encrypt without being able to decrypt**: Use [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md). Edge pipelines hold only a public key, and only the holder of the private key can read the values.
* **Exchange data with a system that uses AES-GCM**: Use [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md), whose output layout matches common libraries.
* **Keep subnet relationships between IP addresses**: Use [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md).

The following sections explain the properties behind these recommendations.

## Authenticated encryption

The AES and HPKE functions provide *authenticated encryption*. Every ciphertext carries a 16-byte tag that the decryption checks. If someone modified the ciphertext, or if you decrypt with the wrong key, the check fails and the function returns `null` with a warning instead of returning garbage. Without authentication, an attacker can flip bits in a ciphertext and predictably change the decrypted value, which is why Tenzir does not offer unauthenticated modes such as AES-CBC or AES-CTR.

FF1 and Crypto-PAn do not authenticate. Their output has exactly the format of the input, which leaves no room for a tag. Decrypting with the wrong key returns a wrong value of the right format, without an error.

### Associated data

The AES and HPKE functions accept *associated data* through the `aad` argument. The function authenticates the associated data together with the ciphertext, but neither encrypts it nor stores it in the output. Decryption succeeds only with the same associated data.

Associated data binds a ciphertext to its context. If you pass the tenant name as associated data, a ciphertext copied from one tenant’s events into another’s fails to decrypt. Good candidates are values that the decrypting pipeline also knows, such as the tenant, the field name, or the event type. The `aad` argument takes an expression, so every event can use its own value.

FF1 has a similar concept, the *tweak*. A tweak changes the output without being stored in it, so the same card number in two different fields encrypts differently. Unlike associated data, a wrong tweak does not cause an error but a wrong result.

## Randomized and deterministic encryption

AES-GCM, AES-GCM-SIV, and HPKE are *randomized*: each call draws fresh random values, so encrypting the same value twice yields two different ciphertexts. An observer learns nothing about the values except their lengths, not even whether two events contain the same value.

AES-SIV, FF1, and Crypto-PAn are *deterministic*: the same value, key, and associated data always produce the same ciphertext. This keeps equality intact, which is useful for analytics on pseudonymized data. It also means that the ciphertext reveals which events share a value and how often each value occurs. For fields with few distinct values, such as a country or a status code, that frequency alone often reveals the plaintext. Use deterministic encryption for high-cardinality identifiers like user names, email addresses, or account numbers, and use randomized encryption for everything else.

To keep equal values in different fields from producing equal ciphertexts, pass the field name as associated data or tweak.

## Nonces and key limits

AES-GCM and AES-GCM-SIV need a 12-byte *nonce* that differs for every encryption with the same key. Tenzir draws a random nonce for every value and stores it at the start of the ciphertext.

Random nonces eventually repeat. For AES-GCM, a repeated nonce is catastrophic: it reveals the relationship between the two plaintexts and lets an attacker forge ciphertexts. NIST therefore limits a key to 232 encryptions with random nonces. That sounds like a lot, but a pipeline that encrypts 50,000 values per second reaches it in about a day.

AES-GCM-SIV derives a separate key for every nonce and computes its IV from the plaintext. If a nonce repeats, an attacker learns only whether the two plaintexts are equal. This makes AES-GCM-SIV the better choice for high-volume pipelines. When you use AES-GCM, rotate keys well before the limit.

AES-SIV does not use a nonce at all, which is what makes it deterministic.

## Format-preserving encryption

FF1 treats a value as a string of numerals over an *alphabet*, such as the ten decimal digits, and encrypts it into another string of the same length over the same alphabet. Characters outside the alphabet pass through unchanged, so `4111-1111-1111-1111` becomes another 16-digit number with the dashes in place.

Format-preserving encryption is a compromise. It keeps data usable for systems that validate formats, but it is deterministic, does not authenticate, and works on small domains, all of which leak more than the AES functions. Keep the following in mind:

* **Domain size**: NIST requires at least one million possible values. With the decimal alphabet, a value needs at least 6 digits. Tenzir returns `null` with a warning for shorter values.
* **Length**: The cost of FF1 grows quadratically with the length of a value. Tenzir encrypts at most 4096 characters from the alphabet and returns `null` with a warning for longer values.
* **Checksums**: FF1 preserves the alphabet and the length, not checksums. An encrypted card number usually fails the Luhn check. To keep it valid, encrypt the number without its check digit and append a new one with [`luhn_check_digit`](https://tenzir.com/docs/reference/functions/luhn_check_digit.md). Decryption then recomputes the check digit, so the round trip restores only numbers that were valid before encryption. FF1 also changes the leading digits that identify the card issuer, unless you keep them in clear text. Our guide on [keeping card numbers valid](../guides/protect/encrypt-sensitive-data.md#keep-card-numbers-valid) covers both.
* **FF3**: NIST withdrew FF3 and FF3-1 in its 2025 draft revision of SP 800-38G after attacks on their tweak schedule. Tenzir implements only FF1.

## Public-key encryption with HPKE

With the symmetric functions, everyone who can encrypt can also decrypt. Hybrid Public Key Encryption (HPKE) separates the two capabilities: the public key encrypts, and only the private key decrypts. A collector at the edge can encrypt personal data with a public key, while the private key stays with the few people who may re-identify users.

For every value, [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md) generates an ephemeral key pair, agrees on a shared secret with the recipient’s public key, derives an AES-256-GCM key from it, and encrypts the value. The output starts with the ephemeral public key, which the recipient needs for the key agreement. The key type selects the HPKE suite:

| Key type | KEM                        | KDF         | AEAD        | Ephemeral key size |
| -------- | -------------------------- | ----------- | ----------- | ------------------ |
| X25519   | DHKEM(X25519, HKDF-SHA256) | HKDF-SHA256 | AES-256-GCM | 32 bytes           |
| X448     | DHKEM(X448, HKDF-SHA512)   | HKDF-SHA512 | AES-256-GCM | 56 bytes           |
| P-256    | DHKEM(P-256, HKDF-SHA256)  | HKDF-SHA256 | AES-256-GCM | 65 bytes           |
| P-384    | DHKEM(P-384, HKDF-SHA384)  | HKDF-SHA384 | AES-256-GCM | 97 bytes           |
| P-521    | DHKEM(P-521, HKDF-SHA512)  | HKDF-SHA512 | AES-256-GCM | 133 bytes          |

The key agreement makes HPKE roughly 100 times slower than the AES functions, in the order of 10,000 values per second for a single pipeline. Use it for selected fields rather than for entire events at high rates. The OpenSSL implementation of HPKE does not support empty plaintexts, so encrypting an empty value returns `null` with a warning.

## Keys

Read keys as secrets, so that they never appear in pipeline definitions. The functions also accept a constant string or blob as an [ad-hoc secret](secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition, so reserve this for testing. The public key of HPKE doesn’t need to stay confidential, so it may be a plain value without this drawback.

The AES and FF1 functions take keys as raw bytes, so a 32-byte key for AES-256 must be exactly 32 bytes long. Secret stores usually hold keys in a text encoding, which you decode in the pipeline:

```tql
let $key = secret("pii-key").decode_hex()
```

Keep the following practices in mind:

* **Limit access to the secret store.** Anyone with access to a workspace can obtain its secrets, as our explanation of [secrets](secrets.md) describes. HPKE avoids this exposure for encryption, because a public key does not need to be secret.
* **Protect public keys from replacement.** A public key doesn’t need to stay confidential, but anyone who replaces it with their own key can read all data that pipelines encrypt from then on. Distribute public keys so that only administrators can change them.
* **Use one key per purpose.** Do not share a key between different functions, such as AES-GCM-SIV and FF1, or between unrelated data sets.
* **Plan for rotation.** Ciphertexts do not identify their key. Store a key identifier next to the ciphertext, so that you can decrypt old data after you introduce a new key.
* **Secrets stay secret.** The functions refuse to encrypt values of type `secret`, because the ciphertext would reveal the secret to anyone with the key.

## Ciphertext layouts

The encrypted values follow their specifications, so other implementations can decrypt what Tenzir encrypts and vice versa:

| Function                                                                                    | Layout                                   | Specification                     |
| ------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)         | nonce (12) ‖ ciphertext ‖ tag (16)       | NIST SP 800-38D                   |
| [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md) | nonce (12) ‖ ciphertext ‖ tag (16)       | RFC 8452                          |
| [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)         | synthetic IV (16) ‖ ciphertext           | RFC 5297                          |
| [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)               | encapsulated key ‖ ciphertext ‖ tag (16) | RFC 9180, base mode, empty `info` |
| [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)                 | Same format as the input                 | NIST SP 800-38G                   |

The specifications of AES-GCM and AES-GCM-SIV leave it to the application to transmit the nonce. Tenzir puts it in front of the ciphertext, so that every value is self-contained. AES-SIV authenticates its associated data as a single component, which is empty when you omit `aad`. Encrypted values are blobs, which JSON output renders as Base64. Decode them with [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md) before decrypting data that arrives as JSON.

FF1 encrypts strings of numerals, and Tenzir adds a step around it. It maps every character of the alphabet to its position in the alphabet, encrypts the resulting numerals as one string, and puts the characters outside the alphabet back in place. For values that consist only of alphabet characters, the result matches other FF1 implementations with the same key, alphabet, and tweak. For values with other characters, such as the dashes in `4111-1111-1111-1111`, another implementation must remove and reinsert those characters the same way to exchange values with Tenzir.

## See also

* [Encrypt sensitive data](../guides/protect/encrypt-sensitive-data.md)
* [Mask sensitive data](../guides/protect/mask-sensitive-data.md)
* [Secrets](secrets.md)
