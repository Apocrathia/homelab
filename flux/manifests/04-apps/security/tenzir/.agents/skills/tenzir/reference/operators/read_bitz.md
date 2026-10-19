---
title: "read_bitz"
canonical: https://tenzir.com/docs/reference/operators/read_bitz
source: https://tenzir.com/docs/reference/operators/read_bitz.md
section: "Docs"
---

# read_bitz

> Parses bytes as BITZ format.

Parses bytes as *BITZ* format.

```tql
read_bitz
```

## Description

BITZ is short for **Bi**nary **T**en**z**ir and is our internal wire format.

Use BITZ when you need high-throughput structured data exchange with minimal overhead. BITZ serializes Tenzir’s in-memory columnar batches directly. A single message can hold events of different schemas and requires no conversion when read back. Our [data model explanation](../../explanations/data-model.md) describes the batch layout.

Each message starts with a magic number and a 64-bit size prefix.

The operator also reads BITZ written by earlier versions of Tenzir, which wrapped Apache Arrow’s IPC format.

Use [`write_bitz`](https://tenzir.com/docs/reference/operators/write_bitz.md) to create `.bitz` files that you can later load again with [`read_bitz`](https://tenzir.com/docs/reference/operators/read_bitz.md).

## See Also

* [`read_feather`](https://tenzir.com/docs/reference/operators/read_feather.md)
* [`read_parquet`](https://tenzir.com/docs/reference/operators/read_parquet.md)
* [`write_bitz`](https://tenzir.com/docs/reference/operators/write_bitz.md)
* [Parse binary data](../../guides/parse/parse-binary-data.md)
