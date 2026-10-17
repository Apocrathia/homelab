---
title: "encrypt_hpke"
canonical: https://tenzir.com/docs/reference/functions/encrypt_hpke
source: https://tenzir.com/docs/reference/functions/encrypt_hpke.md
section: "Docs"
---

# encrypt_hpke

> Encrypts a value for the holder of a private key with HPKE.

Encrypts a value for the holder of a private key with HPKE.

```tql
encrypt_hpke(x:blob|string, public_key=blob|string|secret, [aad=blob|string]) -> blob
```

## Description

The `encrypt_hpke` function encrypts `x` with Hybrid Public Key Encryption (HPKE), as specified in RFC 9180. It uses the base mode with an empty `info`.

HPKE is public-key encryption: anyone with the public key can encrypt, but only the holder of the private key can decrypt with [`decrypt_hpke`](https://tenzir.com/docs/reference/functions/decrypt_hpke.md). Your collectors therefore never hold a key that can decrypt the data they encrypt.

The type of the public key selects the HPKE suite:

| Key type | KEM           | KDF         | AEAD        | Encapsulated key |
| -------- | ------------- | ----------- | ----------- | ---------------- |
| X25519   | DHKEM(X25519) | HKDF-SHA256 | AES-256-GCM | 32 bytes         |
| X448     | DHKEM(X448)   | HKDF-SHA512 | AES-256-GCM | 56 bytes         |
| P-256    | DHKEM(P-256)  | HKDF-SHA256 | AES-256-GCM | 65 bytes         |
| P-384    | DHKEM(P-384)  | HKDF-SHA384 | AES-256-GCM | 97 bytes         |
| P-521    | DHKEM(P-521)  | HKDF-SHA512 | AES-256-GCM | 133 bytes        |

The output has the following layout:

```plaintext
encapsulated key || ciphertext || tag (16 bytes)
```

The ciphertext has the same length as the input. Other RFC 9180 implementations can decrypt the output when they use the same suite and an empty `info`, and split off the encapsulated key from the front.

The function generates a fresh ephemeral key for every value, so the output differs on every run. This costs a key agreement per value, which makes HPKE roughly 100 times slower than the AES functions: expect about 10,000 values per second per pipeline on a laptop. Use HPKE for selected fields rather than for entire events.

The function returns a `blob`, which JSON output renders as Base64. To turn the result into a string, encode it with [`encode_base64`](https://tenzir.com/docs/reference/functions/encode_base64.md) or [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md).

### `x: blob|string`

The value to encrypt.

The function returns `null` for `null` values. For values of other types, it returns `null` and emits a warning. The HPKE implementation of OpenSSL doesn’t support empty plaintexts, so the function also returns `null` with a warning for empty values.

### `public_key = blob|string|secret`

The public key of the recipient. The key must be a constant. A public key doesn’t need to stay confidential, so it may be a plain value or a secret. Make sure that nobody can replace it, though: whoever controls the public key can read everything that the function encrypts.

The function accepts these key formats:

* A PEM-encoded X25519, X448, P-256, P-384, or P-521 public key in the SubjectPublicKeyInfo format (`-----BEGIN PUBLIC KEY-----`).
* A raw X25519 public key with 32 bytes.
* A raw X448 public key with 56 bytes.

The function interprets every key with 32 or 56 bytes that is not PEM-encoded as a raw X25519 or X448 key. Pass keys of other types, such as P-256 keys, in PEM format.

An invalid or unsupported key is an error when the pipeline starts.

The function uses the bytes of the key as they are. If you have a raw key in hex or Base64 form, decode it first with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md). Pass a PEM-encoded key without decoding.

To create a key pair with OpenSSL, run:

```sh
openssl genpkey -algorithm X25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
```

Distribute `public.pem` to the pipelines that encrypt, and keep `private.pem` where you decrypt.

### `aad = blob|string (optional)`

Associated data that the function authenticates but does not encrypt. The value can differ per event, for example the name of a field or a tenant ID.

Decryption only succeeds with the same associated data. Omitting `aad` is the same as passing an empty value.

If `aad` is `null`, for example because an event lacks the field that holds it, the function returns `null` and emits a warning. To fall back to an empty value instead, use [`else`](https://tenzir.com/docs/reference/expressions.md#fallback-with-else), for example `aad=tenant? else ""`.

## Examples

The examples read their keys from a secret store that holds the following secrets:

| Secret                  | Value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `hpke-private-key`      | `c8b5a8a159dc630b7894cea4add7d1478dbe0dc720744e8db3d3c228e6a4f36a`, a raw X25519 key |
| `hpke-p256-private-key` | The PEM-encoded private key of the P-256 public key in the examples                  |

### Encrypt and decrypt a field

This example uses a raw X25519 key pair:

```tql
let $public_key = decode_hex("2031818f562622db6a4ead4d2b801da571436439f568d7399f5d000de8b5920e")
let $private_key = secret("hpke-private-key").decode_hex()
from {email: "alice@example.com"}
encrypted = encrypt_hpke(email, public_key=$public_key)
decrypted = decrypt_hpke(encrypted, private_key=$private_key).string()
drop encrypted
```

```tql
{
  email: "alice@example.com",
  decrypted: "alice@example.com",
}
```

### Use PEM-encoded keys

Raw strings can span multiple lines, so you can paste a PEM-encoded public key directly. The private key stays in the secret store. This example uses a P-256 key pair:

```tql
let $public_key = r"-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE8pQxsrjlr/4I2XrX48xqmrPU0Ge7
xXkQRP5xg5Bwxwz3gSK9s5add0uVGOKacbfKapkj61XhofzEovNrtxFvYg==
-----END PUBLIC KEY-----"
let $private_key = secret("hpke-p256-private-key")
from {email: "alice@example.com"}
encrypted = encrypt_hpke(email, public_key=$public_key)
decrypted = decrypt_hpke(encrypted, private_key=$private_key).string()
drop encrypted
```

```tql
{
  email: "alice@example.com",
  decrypted: "alice@example.com",
}
```

### Load the public key from a file

Read a PEM-encoded key with [`file_contents`](https://tenzir.com/docs/reference/functions/file_contents.md), which requires an absolute path:

```tql
from {email: "alice@example.com"}
email = encrypt_hpke(email, public_key=file_contents("/etc/tenzir/public.pem"))
```

### Compare the output with the input

Every encryption uses a fresh ephemeral key, so equal values encrypt to different outputs. The hex encoding uses two digits per byte, so the 17-byte input grows to 65 bytes: 32 bytes of encapsulated X25519 key and 16 bytes of tag.

```tql
let $public_key = decode_hex("2031818f562622db6a4ead4d2b801da571436439f568d7399f5d000de8b5920e")
from {email: "alice@example.com"}
first = encrypt_hpke(email, public_key=$public_key)
second = encrypt_hpke(email, public_key=$public_key)
equal = first == second
input_hex_digits = email.encode_hex().length_bytes()
output_hex_digits = first.encode_hex().length_bytes()
drop first, second
```

```tql
{
  email: "alice@example.com",
  equal: false,
  input_hex_digits: 34,
  output_hex_digits: 130,
}
```

### Bind the ciphertext to a tenant

Pass the tenant as associated data so that the ciphertext only decrypts in the context of that tenant. Decryption with different associated data returns `null` and emits a warning:

```tql
let $public_key = decode_hex("2031818f562622db6a4ead4d2b801da571436439f568d7399f5d000de8b5920e")
let $private_key = secret("hpke-private-key").decode_hex()
from {tenant: "tenant-a", email: "alice@example.com"}
email = encrypt_hpke(email, public_key=$public_key, aad=tenant)
same_tenant = decrypt_hpke(email, private_key=$private_key, aad="tenant-a").string()
other_tenant = decrypt_hpke(email, private_key=$private_key, aad="tenant-b").string()
drop email
```

```tql
{
  tenant: "tenant-a",
  same_tenant: "alice@example.com",
  other_tenant: null,
}
```

## See Also

* [`decrypt_hpke`](https://tenzir.com/docs/reference/functions/decrypt_hpke.md)
* [`encrypt_aes_gcm_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm_siv.md)
* [`encrypt_aes_gcm`](https://tenzir.com/docs/reference/functions/encrypt_aes_gcm.md)
* [`encrypt_aes_siv`](https://tenzir.com/docs/reference/functions/encrypt_aes_siv.md)
* [`encrypt_ff1`](https://tenzir.com/docs/reference/functions/encrypt_ff1.md)
* [Encrypt sensitive data](../../guides/protect/encrypt-sensitive-data.md)
* [Encryption](../../explanations/encryption.md)
