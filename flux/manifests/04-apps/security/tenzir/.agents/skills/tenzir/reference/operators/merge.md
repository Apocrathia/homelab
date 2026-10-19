---
title: "merge"
canonical: https://tenzir.com/docs/reference/operators/merge
source: https://tenzir.com/docs/reference/operators/merge.md
section: "Docs"
---

# merge

> Merges the output of a source subpipeline into the main stream.

Merges the output of a source subpipeline into the main stream.

```tql
merge { … }
```

## Description

The `merge` operator runs a subpipeline that starts with its own source and merges the events it produces into the main input stream. The main input passes through unchanged, and the subpipeline’s output is interleaved with it.

`merge` is the dual of [`fork`](https://tenzir.com/docs/reference/operators/fork.md): where `fork` attaches an additional *sink* that consumes a copy of the input, `merge` attaches an additional *source* that contributes events to the output.

Use `merge` when you want to combine an independent stream of events with the one flowing through your pipeline:

```tql
from_file "/var/log/primary.json", watch=10s
merge {
  from_file "/var/log/secondary.json", watch=10s
}
import
```

The guide on how to [merge streams within a single pipeline](../../guides/route/split-and-merge-streams.md#merge-within-a-single-pipeline) contrasts this with connecting separate pipelines through a topic.

### `{ … }`

The subpipeline to execute. It must be a source, that is, it must begin with an operator that produces events on its own (such as [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md) or [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md)) and it must produce events. The subpipeline must not consume the input, end in a sink, or produce bytes.

The order in which events from the main stream and the subpipeline appear in the output is not defined.

## Examples

The following example merges two literal event streams, which shows how the subpipeline’s events join the main stream.

### Combine a live feed with an additional source

```tql
from {x: 1}, {x: 2}
merge {
  from {y: 1}
}
```

```tql
{x: 1}
{x: 2}
{y: 1}
```

## See Also

* [`fork`](https://tenzir.com/docs/reference/operators/fork.md)
* [`fork_merge`](https://tenzir.com/docs/reference/operators/fork_merge.md)
* [Split and merge streams](../../guides/route/split-and-merge-streams.md)
