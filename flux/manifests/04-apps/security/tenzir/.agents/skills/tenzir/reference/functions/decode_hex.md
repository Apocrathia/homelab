---
title: "decode_hex"
canonical: https://tenzir.com/docs/reference/functions/decode_hex
source: https://tenzir.com/docs/reference/functions/decode_hex.md
section: "Docs"
---

# decode_hex

> Decodes bytes from their hexadecimal representation.

Decodes bytes from their hexadecimal representation.

```tql
decode_hex(bytes: blob|string) -> blob
```

## Description

Decodes bytes from their hexadecimal representation.

### `bytes: blob|string`

The value to decode.

## Examples

### Decode a blob from hex

```tql
from {bytes: "54656E7A6972"}
decoded = bytes.decode_hex()
```

```tql
{bytes: "54656E7A6972", decoded: "Tenzir"}
```

### Decode a mixed-case hex string

```tql
from {bytes: "4e6f6E6365"}
decoded = bytes.decode_hex()
```

```tql
{bytes: "4e6f6E6365", decoded: "Nonce"}
```

## See Also

* [`encode_hex`](https://tenzir.com/docs/reference/functions/encode_hex.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
