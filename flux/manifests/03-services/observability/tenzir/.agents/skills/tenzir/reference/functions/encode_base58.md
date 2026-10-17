---
title: "encode_base58"
canonical: https://tenzir.com/docs/reference/functions/encode_base58
source: https://tenzir.com/docs/reference/functions/encode_base58.md
section: "Docs"
---

# encode_base58

> Encodes bytes as Base58.

Encodes bytes as Base58.

```tql
encode_base58(bytes: blob|string) -> string
```

## Description

Encodes bytes as Base58.

### `bytes: blob|string`

The value to encode as Base58.

## Examples

### Encode a string as Base58

```tql
from { input: "Hello World" }
encoded = input.encode_base58()
```

```tql
{
  input: "Hello World",
  encoded: "JxF12TrwUP45BMd",
}
```

## See Also

* [`decode_base58`](https://tenzir.com/docs/reference/functions/decode_base58.md)
