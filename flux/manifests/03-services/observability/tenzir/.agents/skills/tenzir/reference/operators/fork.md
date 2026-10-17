---
title: "fork"
canonical: https://tenzir.com/docs/reference/operators/fork
source: https://tenzir.com/docs/reference/operators/fork.md
section: "Docs"
---

# fork

> Executes a subpipeline with a copy of the input.

Executes a subpipeline with a copy of the input.

```tql
fork { … }
```

## Description

The `fork` operator executes a subpipeline with a copy of its input, that is: whenever an event arrives, it is sent both to the given pipeline and forwarded at the same time to the next operator.

### `{ … }`

The pipeline to execute. Must have a sink.

## Examples

### Publish incoming events while importing them simultaneously

```tql
fork {
  publish "imported-events"
}
import
```
