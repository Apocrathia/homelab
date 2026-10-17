---
title: "quiet"
canonical: https://tenzir.com/docs/reference/operators/quiet
source: https://tenzir.com/docs/reference/operators/quiet.md
section: "Docs"
---

# quiet

> Suppresses runtime warnings from a pipeline.

Suppresses runtime warnings from a pipeline.

```tql
quiet { … }
```

## Description

Subject to change

This operator is experimental and intended for internal use. Its behavior can change without notice.

The `quiet` operator executes its nested pipeline and suppresses the warnings it emits at runtime, including warnings from further nested pipelines. Events and bytes flow through as usual. Errors still fail the pipeline, and diagnostics emitted during compilation remain visible. Warnings outside the nested pipeline are unaffected.

The operator suppresses all runtime warnings in its scope; selecting individual warnings is not supported.

When you combine it with [`strict`](https://tenzir.com/docs/reference/strict/), the innermost operator handles warnings first. A `quiet` block inside `strict` suppresses warnings before they can become errors. A `strict` block inside `quiet` converts warnings to errors, which `quiet` forwards.

## Examples

### Handle expected timestamp parsing failures

```tql
from {time: "2026-09-09T14:30:00Z"}, {time: "something-else-but-expected"}
quiet {
  ts = time.parse_time("%Y-%m-%dT%H:%M:%SZ")
}
if ts == null {
  ts = now()
}
```

The invalid timestamp produces `null` without a runtime warning. The following `if` statement replaces it with the current time.
