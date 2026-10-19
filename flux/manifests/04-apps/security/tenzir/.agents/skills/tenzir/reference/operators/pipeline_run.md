---
title: "pipeline_run"
canonical: https://tenzir.com/docs/reference/operators/pipeline_run
source: https://tenzir.com/docs/reference/operators/pipeline_run.md
section: "Docs"
---

# pipeline_run

> Starts a pipeline in the node and waits for it to complete.

Starts a pipeline in the node and waits for it to complete.

```tql
pipeline_run { … }, [id=string]
```

## Description

The `pipeline_run` operator starts a hidden managed pipeline in the node, and returns when the pipeline has finished.

Note that pipelines may emit diagnostics after they have finished.

Subject to Change

This operator primarily exists for testing purposes, where it is often required to run pipelines with an explicitly specified pipeline id.

### `{ … }`

The pipeline to execute. This pipeline runs as a separate managed pipeline within the node.

### `id = string (optional)`

Sets the pipeline’s ID explicitly, instead of assigning a random ID. This corresponds to the `id` field in the output of `pipeline_list`, and the `pipeline_id` field in the output of `metrics` and `diagnostics`.

## Examples

### Run a pipeline in the background and wait for it to complete

```tql
pipeline_run {
  every 1min {
    version
  }
  select version
  to_stdout {
    write_lines
  }
}
```

## See Also

* [`pipeline_detach`](https://tenzir.com/docs/reference/operators/pipeline_detach.md)
* [`pipeline_list`](https://tenzir.com/docs/reference/operators/pipeline_list.md)
