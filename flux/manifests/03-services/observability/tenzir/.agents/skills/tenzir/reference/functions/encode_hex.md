---
title: "encode_hex"
canonical: https://tenzir.com/docs/reference/functions/encode_hex
source: https://tenzir.com/docs/reference/functions/encode_hex.md
section: "Docs"
---

# encode_hex

> Encodes bytes into their hexadecimal representation.

Encodes bytes into their hexadecimal representation.

```tql
encode_hex(bytes: blob|string) -> string
```

## Description

Encodes bytes into their hexadecimal representation.

### `bytes: blob|string`

The value to encode.

## Examples

### Encode a string to hex

```tql
from {bytes: "Tenzir"}
encoded = bytes.encode_hex()
```

```tql
{bytes: "Tenzir", encoded: "54656E7A6972"}
```

## See Also

* [`decode_hex`](https://tenzir.com/docs/reference/functions/decode_hex.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
