---
title: "decode_base58"
canonical: https://tenzir.com/docs/reference/functions/decode_base58
source: https://tenzir.com/docs/reference/functions/decode_base58.md
section: "Docs"
---

# decode_base58

> Decodes bytes as Base58.

Decodes bytes as Base58.

```tql
decode_base58(bytes: blob|string) -> blob
```

## Description

Decodes bytes as Base58.

### `bytes: blob|string`

The value to decode as Base58.

## Examples

### Decode a Base58 encoded string

```tql
from {bytes: "JxF12TrwUP45BMd"}
decoded = bytes.decode_base58()
```

```tql
{bytes: "JxF12TrwUP45BMd", decoded: "Hello World"}
```

## See Also

* [`encode_base58`](https://tenzir.com/docs/reference/functions/encode_base58.md)
