---
title: "encrypt_cryptopan"
canonical: https://tenzir.com/docs/reference/functions/encrypt_cryptopan
source: https://tenzir.com/docs/reference/functions/encrypt_cryptopan.md
section: "Docs"
---

# encrypt_cryptopan

> Encrypts an IP address via Crypto-PAn.

Encrypts an IP address via Crypto-PAn.

```tql
encrypt_cryptopan(address:ip, [seed=secret])
```

## Description

The `encrypt_cryptopan` function encrypts the IP `address` using the [Crypto-PAn](https://en.wikipedia.org/wiki/Crypto-PAn) algorithm.

### `address: ip`

The IP address to encrypt.

### `seed = secret (optional)`

The key of the permutation, as a secret with exactly 32 bytes.

Read the seed with [`secret`](https://tenzir.com/docs/reference/functions/secret.md), so that it stays out of the pipeline definition. A seed of another size is an error when the pipeline starts. A constant string or blob with 32 bytes also works as an [ad-hoc secret](../../explanations/secrets.md#ad-hoc-secrets), but then the seed appears in the pipeline definition. If your secret store holds the seed in hex or Base64 form, decode it with [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md) or [`decode_base64`](https://tenzir.com/docs/reference/functions/decode_base64.md), for example `seed=secret("cryptopan-key").decode_hex()`.

Without a seed, the function uses a key of zeros. Anyone can reverse addresses that use that key, so always pass a seed to protect addresses.

## Examples

The examples read their seed from a secret store that holds the secret `cryptopan-key` with the hex-encoded value `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`.

### Encrypt IP address fields

```tql
let $seed = secret("cryptopan-key").decode_hex()
from {src: 114.13.11.35, dst: 114.56.11.200}
src = src.encrypt_cryptopan(seed=$seed)
dst = dst.encrypt_cryptopan(seed=$seed)
```

```tql
{
  src: 162.61.72.224,
  dst: 162.4.52.80,
}
```

## See Also

* [`community_id`](https://tenzir.com/docs/reference/functions/community_id.md)
* [`decrypt_cryptopan`](https://tenzir.com/docs/reference/functions/decrypt_cryptopan.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
* [Mask sensitive data](../../guides/protect/mask-sensitive-data.md)
