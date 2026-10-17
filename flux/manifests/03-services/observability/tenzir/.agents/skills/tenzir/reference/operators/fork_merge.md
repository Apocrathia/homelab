---
title: "fork_merge"
canonical: https://tenzir.com/docs/reference/operators/fork_merge
source: https://tenzir.com/docs/reference/operators/fork_merge.md
section: "Docs"
---

# fork_merge

> Runs multiple subpipelines on the same input and merges their outputs.

Runs multiple subpipelines on the same input and merges their outputs.

```tql
fork_merge { … }, { … }, …
```

## Description

The `fork_merge` operator sends a copy of every incoming event to each of its subpipelines. The subpipelines run independently, and their outputs are merged back into a single stream.

Use `fork_merge` when you want to compute several independent results from the same data and continue with the combined output:

```tql
subscribe "in"
fork_merge {
  summarize a=sum(bytes)
}, {
  summarize b=count()
}
publish "out"
```

Unlike [`fork`](https://tenzir.com/docs/reference/operators/fork.md), whose subpipeline must end in a sink and which forwards its input unchanged, `fork_merge` fans out independent computations and rejoins their results.

### `{ … }`

The subpipelines to execute. Each receives a copy of the full input. Provide two or more subpipelines separated by commas.

Every subpipeline must transform events into events. Their outputs are merged into a single stream. Subpipelines must not end in a sink or produce bytes.

Use [`pass`](https://tenzir.com/docs/reference/operators/pass.md) as a branch to forward the input unchanged alongside the other branches.

The order in which events from different branches appear in the output is not defined.

## Examples

### Compute several aggregates over the same stream

```tql
from {x: 1}, {x: 2}, {x: 3}
fork_merge {
  summarize s=sum(x)
}, {
  summarize m=max(x)
}
```

```tql
{s: 6}
{m: 3}
```

### Enrich along independent paths and merge the results

```tql
subscribe "events"
fork_merge {
  where severity == "high"
  set priority = 1
}, {
  where severity != "high"
  set priority = 3
}
publish "prioritized"
```

## See Also

* [`fork`](https://tenzir.com/docs/reference/operators/fork.md)
