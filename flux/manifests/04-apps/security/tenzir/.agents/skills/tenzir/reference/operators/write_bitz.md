---
title: "write_bitz"
canonical: https://tenzir.com/docs/reference/operators/write_bitz
source: https://tenzir.com/docs/reference/operators/write_bitz.md
section: "Docs"
---

# write_bitz

> Writes events in BITZ format.

Writes events in *BITZ* format.

```tql
write_bitz
```

## Description

BITZ is short for **Bi**nary **T**en**z**ir and is our internal wire format.

Use BITZ when you need high-throughput structured data exchange with minimal overhead. BITZ serializes Tenzir’s in-memory columnar batches directly. A single message can hold events of different schemas and requires no conversion when read back. Our [data model explanation](../../explanations/data-model.md) describes the batch layout.

Each message starts with a magic number and a 64-bit size prefix.

Use [`write_bitz`](https://tenzir.com/docs/reference/operators/write_bitz.md) when you want to persist events in a compact columnar format and later load them again with [`read_bitz`](https://tenzir.com/docs/reference/operators/read_bitz.md).

## See Also

* [`read_bitz`](https://tenzir.com/docs/reference/operators/read_bitz.md)
* [`write_feather`](https://tenzir.com/docs/reference/operators/write_feather.md)
* [`write_parquet`](https://tenzir.com/docs/reference/operators/write_parquet.md)
* [Parse binary data](../../guides/parse/parse-binary-data.md)
