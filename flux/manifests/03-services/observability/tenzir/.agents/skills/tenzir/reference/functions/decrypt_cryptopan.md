---
title: "decrypt_cryptopan"
canonical: https://tenzir.com/docs/reference/functions/decrypt_cryptopan
source: https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md
section: "Docs"
---

# decrypt_cryptopan

> Decrypts an IP address via Crypto-PAn.

Decrypts an IP address via Crypto-PAn.

```tql
decrypt_cryptopan(address:ip, [seed=secret], [family=string])
```

## Description

The `decrypt_cryptopan` function decrypts an IP `address` that was encrypted with [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md) and the same seed.

Tenzir represents IPv4 addresses as IPv4-mapped IPv6 addresses with the `::ffff/96` prefix. [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md) preserves this prefix for IPv4 addresses and permutes only the final 32 bits. For IPv6 addresses, it permutes the full 128-bit address.

By default, `decrypt_cryptopan` infers the address family from the ciphertext: addresses under `::ffff/96` decrypt as IPv4, and all other addresses decrypt as IPv6. A true IPv6 ciphertext can still land under `::ffff/96`, but this requires the first 96 encrypted bits to match the IPv4-mapped prefix exactly. The probability is therefore `2^-96`, or about `1.26e-29`.

### `address: ip`

The IP address to decrypt.

### `seed = secret (optional)`

The key of the permutation, as a secret with exactly 32 bytes.

Read the seed with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A seed of another size is an error when the pipeline starts. A constant string or blob with 32 bytes also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the seed appears in the pipeline definition. If your secret store holds the seed in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `seed=secret("cryptopan-key").decode_hex()`.

Without a seed, the function uses a key of zeros. Anyone can reverse addresses that use that key, so always pass a seed to protect addresses.

### `family = string (optional)`

The Crypto-PAn address family to decrypt in. Valid values are `ipv4` and `ipv6`.

Set this to `ipv6` when decrypting an IPv6 ciphertext that happens to look like an IPv4-mapped address.

## Examples

The examples read their seed from a secret store that holds the secret `cryptopan-key` with the hex-encoded value `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`.

### Decrypt IP address fields

```tql
let $seed = secret("cryptopan-key").decode_hex()
from {src: 2.90.93.17, dst: dd92:2c44:3fc0:ff1e:7ff9:c7f0:8180:7e00}
src = src.decrypt_cryptopan(seed=$seed)
dst = dst.decrypt_cryptopan(seed=$seed)
```

```tql
{
  src: 192.0.2.1,
  dst: 2001:db8::1,
}
```

### Decrypt an IPv4-mapped IPv6 ciphertext

```tql
let $seed = secret("cryptopan-key").decode_hex()
from {address: 192.0.2.1}
address = address.decrypt_cryptopan(seed=$seed, family="ipv6")
```

```tql
{
  address: c3ff:3ff8:7cff:81f1:4c03:f000:7f08:7c4e,
}
```

## See Also

* [`community_id`](https://tenzir.com/docs/reference/functions/community_id.md)
* [`encrypt_cryptopan`](https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
