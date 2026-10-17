---
title: "decrypt_hpke"
canonical: https://tenzir.com/docs/reference/functions/decrypt_hpke
source: https://tenzir.com/docs/reference/functions/decrypt_hpke.md
section: "Docs"
---

# decrypt_hpke

> Decrypts a value that was encrypted with HPKE.

Decrypts a value that was encrypted with HPKE.

```tql
decrypt_hpke(x:blob|string, private_key=secret, [aad=blob|string]) -> blob
```

## Description

The `decrypt_hpke` function decrypts the output of [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md) with Hybrid Public Key Encryption (HPKE), as specified in RFC 9180. It uses the base mode with an empty `info`.

The type of the private key selects the HPKE suite:

| Key type | KEM           | KDF         | AEAD        | Encapsulated key |
| -------- | ------------- | ----------- | ----------- | ---------------- |
| X25519   | DHKEM(X25519) | HKDF-SHA256 | AES-256-GCM | 32 bytes         |
| X448     | DHKEM(X448)   | HKDF-SHA512 | AES-256-GCM | 56 bytes         |
| P-256    | DHKEM(P-256)  | HKDF-SHA256 | AES-256-GCM | 65 bytes         |
| P-384    | DHKEM(P-384)  | HKDF-SHA384 | AES-256-GCM | 97 bytes         |
| P-521    | DHKEM(P-521)  | HKDF-SHA512 | AES-256-GCM | 133 bytes        |

The function expects the following layout:

```plaintext
encapsulated key || ciphertext || tag (16 bytes)
```

You can decrypt values that other RFC 9180 implementations encrypted, as long as they use the same suite and an empty `info`, and prefix the encapsulated key to the ciphertext.

The function verifies the authentication tag before it returns a value. When the private key or the associated data don’t match, or when the ciphertext was modified, the function returns `null` and emits a warning once per batch.

The function returns a `blob`. Use [`string`](https://tenzir.com/docs/reference/functions/string.md) to convert the result to a string when the plaintext is text.

### `x: blob|string`

The value to decrypt.

The function treats a string as raw bytes. If your ciphertext arrives as Base64 or hex text, for example in JSON, decode it first with [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md) or [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md).

The function returns `null` for `null` values. For values of other types, and for values too short to hold the encapsulated key and the tag, it returns `null` and emits a warning.

### `private_key = secret`

The private key of the recipient, as a secret.

The function accepts these key formats:

* A PEM-encoded X25519, X448, P-256, P-384, or P-521 private key in the PKCS#8 format (`-----BEGIN PRIVATE KEY-----`).
* A raw X25519 private key with 32 bytes.
* A raw X448 private key with 56 bytes.

The function interprets every key with 32 or 56 bytes that is not PEM-encoded as a raw X25519 or X448 key. Pass keys of other types, such as P-256 keys, in PEM format.

The function doesn’t support encrypted PEM-encoded private keys. An invalid or unsupported key is an error when the pipeline starts.

Read the key with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A constant string or blob also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the key appears in the pipeline definition. The function uses the bytes of the secret as they are. If your secret store holds a raw key in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md). Store a PEM-encoded key as it is.

### `aad = blob|string (optional)`

The associated data that was passed during encryption. The value can differ per event.

Decryption only succeeds with the same associated data. Omitting `aad` is the same as passing an empty value.

If `aad` is `null`, for example because an event lacks the field that holds it, the function returns `null` and emits a warning. To fall back to an empty value instead, use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else), for example `aad=tenant? else ""`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret                  | Value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `hpke-private-key`      | `c8b5a8a159dc630b7894cea4add7d1478dbe0dc720744e8db3d3c228e6a4f36a`, a raw X25519 key |
| `hpke-p256-private-key` | A PEM-encoded P-256 private key                                                      |

### Decrypt a hex-encoded ciphertext

This example decrypts a ciphertext for a raw X25519 key that was encrypted with the tenant as associated data:

```tql
let $private_key = secret("hpke-private-key").decode_hex()
from {
  tenant: "tenant-a",
  message: "8e17ed32defd75eeaf0482e1a9531e6b684b5352717552662703bf00e47d163fe658d8d3d2cf439403d669fbcc344175e3dbfa793267",
}
message = message.decode_hex().decrypt_hpke(private_key=$private_key, aad=tenant).string()
```

```tql
{
  tenant: "tenant-a",
  message: "Tenzir",
}
```

### Decrypt with a PEM-encoded private key

Store a PEM-encoded private key in the secret store as it is, without decoding it. This example uses a P-256 key:

```tql
let $private_key = secret("hpke-p256-private-key")
from {
  message: "04b5334499bde3de54a4d17d5400601830c213dc25a949dabbba5c6de7ea5b123bba69b63c3ec72af37b5212fd79caa1fdc3306af9654082bddc9d58f0c376f4013e821178838744dc70936af1a7ff8d471b4bb52f641d",
}
message = message.decode_hex().decrypt_hpke(private_key=$private_key).string()
```

```tql
{
  message: "Tenzir",
}
```

### Detect mismatching associated data

When the associated data differs from the value used during encryption, the function returns `null` and emits a warning:

```tql
let $private_key = secret("hpke-private-key").decode_hex()
from {
  tenant: "tenant-b",
  message: "8e17ed32defd75eeaf0482e1a9531e6b684b5352717552662703bf00e47d163fe658d8d3d2cf439403d669fbcc344175e3dbfa793267",
}
message = message.decode_hex().decrypt_hpke(private_key=$private_key, aad=tenant).string()
```

```tql
{
  tenant: "tenant-b",
  message: null,
}
```

## See Also

* [`encrypt_hpke`](https://tenzir.com/docs/reference/functions/encrypt_hpke.md)
* [`decrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm_siv.md)
* [`decrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/decrypt_aes_gcm.md)
* [`decrypt_aes_siv`](https://tenzir.com/docs/reference/functions/decrypt_aes_siv.md)
* [`decrypt_ff1`](https://tenzir.com/docs/reference/functions/decrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
