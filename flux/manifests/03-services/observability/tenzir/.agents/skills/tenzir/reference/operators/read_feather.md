---
title: "read_feather"
canonical: https://tenzir.com/docs/reference/operators/read_feather
source: https://tenzir.com/docs/reference/operators/read_feather.md
section: "Docs"
---

# read_feather

> Parses an incoming Feather byte stream into events.

Parses an incoming Feather byte stream into events.

```tql
read_feather
```

## Description

Transforms the input [Feather](https://arrow.apache.org/docs/python/feather.html) (a thin wrapper around [Apache Arrow’s IPC](https://arrow.apache.org/docs/python/ipc.html) wire format) byte stream to event stream.

## Examples

### Publish a feather logs file

```tql
from_file "logs.feather" {
  read_feather
}
publish "log"
```

## See Also

* [`read_parquet`](https://tenzir.com/docs/reference/operators/read_parquet.md)
* [`write_feather`](https://tenzir.com/docs/reference/operators/write_feather.md)
