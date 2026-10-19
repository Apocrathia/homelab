---
title: "encode_url"
canonical: https://tenzir.com/docs/reference/functions/encode_url
source: https://tenzir.com/docs/reference/functions/encode_url.md
section: "Docs"
---

# encode_url

> Encodes strings using URL encoding.

Encodes strings using URL encoding.

```tql
encode_url(bytes: blob|string) -> string
```

## Description

Encodes strings or blobs using URL encoding, replacing special characters with their percent-encoded equivalents.

### `bytes: blob|string`

The input to URL encode.

## Examples

### Encode a string as URL encoded

```tql
from {input: "Hello World & Special/Chars?"}
encoded = input.encode_url()
```

```tql
{
  input: "Hello World & Special/Chars?",
  encoded: "Hello%20World%20%26%20Special%2FChars%3F",
}
```

## See Also

* [`decode_url`](https://tenzir.com/docs/reference/functions/decode_url.md)
* [Manipulate strings](../../guides/shape/manipulate-strings.md)
