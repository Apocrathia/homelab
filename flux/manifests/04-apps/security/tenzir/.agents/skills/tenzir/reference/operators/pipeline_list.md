---
title: "pipeline_list"
canonical: https://tenzir.com/docs/reference/operators/pipeline_list
source: https://tenzir.com/docs/reference/operators/pipeline_list.md
section: "Docs"
---

# pipeline_list

> Shows managed pipelines.

Shows managed pipelines.

```tql
pipeline_list
```

## Description

The `pipeline_list` operator returns the list of all managed pipelines. Managed pipelines are pipelines created through the [`/pipeline` API](https://tenzir.com/docs/reference/operators/openapi.md), which includes all pipelines run through the Tenzir Platform.

## Examples

### Count pipelines per state

```tql
pipeline_list
top state
```

```tql
{
  "state": "running",
  "count": 31
}
{
  "state": "failed",
  "count": 4
}
{
  "state": "stopped",
  "count": 2
}
```

### Show pipelines per package

```tql
pipeline_list
summarize package, names=collect(name)
```

```tql
{
  "package": "suricata-ocsf",
  "names": [
    "Suricata Flow to OCSF Network Activity",
    "Suricata DNS to OCSF DNS Activity",
    "Suricata SMB to OCSF SMB Activity",
    // …
  ]
}
```

## See Also

* [`package_list`](https://tenzir.com/docs/reference/operators/package_list.md)
* [`pipeline_detach`](https://tenzir.com/docs/reference/operators/pipeline_detach.md)
* [`pipeline_run`](https://tenzir.com/docs/reference/operators/pipeline_run.md)
