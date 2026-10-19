---
title: "each"
canonical: https://tenzir.com/docs/reference/operators/each
source: https://tenzir.com/docs/reference/operators/each.md
section: "Docs"
---

# each

> Spawns a subpipeline for every incoming event, with the event bound to $this.

Spawns a subpipeline for every incoming event, with the event bound to `$this`.

```tql
each [parallel=int] { … }
```

## Description

The `each` operator runs a fresh subpipeline for every incoming event. The record of the current event is bound to `$this` inside the subpipeline, so the subpipeline can parametrize its behavior on a per-event basis.

The subpipeline takes no input from `each`. It either emits events - which are forwarded as the operator’s output - or ends with a sink, in which case `each` itself becomes a sink. The subpipeline must not produce bytes.

Use `each` for per-event jobs, such as running a lookup, export, or sink whose source depends on the incoming event. For keyed streams that should keep one subpipeline alive per key, use [`group`](https://tenzir.com/docs/reference/operators/group.md) instead.

### `parallel = int (optional)`

The maximum number of subpipelines that may run concurrently. Must be at least `1`. Excess events queue and start as soon as a slot frees.

Defaults to `10`.

### `{ … }`

The subpipeline to spawn for each event. Must start with a source.

Inside the subpipeline, `$this` refers to the record of the current input event.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `each` owns and runs its own child subpipelines. The `parallel` argument limits each instance separately. At a pipeline degree of `N`, up to `N * parallel` child subpipelines can therefore run at once.

For example, `// parallelism: 4` together with `each parallel=10` permits up to 40 concurrent child subpipelines. Keep this combined limit in mind when a child subpipeline connects to a service with concurrency or rate limits.

## Examples

### Run a lookup per event

Use fields from the input event to parametrize a source subpipeline. This example treats the input as investigation cases and searches a historical event set for matching source IPs:

```tql
from {case_id: "C-1", ip: "10.0.0.5"},
     {case_id: "C-2", ip: "10.0.0.7"}
each parallel=4 {
  from {ts: 2024-01-01T10:00:00, src_ip: "10.0.0.5", action: "login"},
       {ts: 2024-01-01T10:02:00, src_ip: "10.0.0.8", action: "scan"},
       {ts: 2024-01-01T10:05:00, src_ip: "10.0.0.7", action: "download"}
  where src_ip == $this.ip
  case_id = $this.case_id
}
sort case_id, ts
```

```tql
{
  ts: 2024-01-01T10:00:00.000000,
  src_ip: "10.0.0.5",
  action: "login",
  case_id: "C-1",
}
{
  ts: 2024-01-01T10:05:00.000000,
  src_ip: "10.0.0.7",
  action: "download",
  case_id: "C-2",
}
```

### Run a per-event sink

When the subpipeline ends with a sink, `each` itself becomes a sink. Use this to write a separate output file per tenant in the input:

```tql
from {tenant: "alpha"}, {tenant: "beta"}
each {
  from {tenant: $this.tenant, status: "ok"},
       {tenant: $this.tenant, status: "fail"}
  to_file f"/tmp/tenzir/{$this.tenant}.json" {
    write_ndjson
  }
}
```

## See Also

* [`cron`](https://tenzir.com/docs/reference/operators/cron.md)
* [`every`](https://tenzir.com/docs/reference/operators/every.md)
* [`fork`](https://tenzir.com/docs/reference/operators/fork.md)
* [`group`](https://tenzir.com/docs/reference/operators/group.md)
* [`parallel`](https://tenzir.com/docs/reference/operators/parallel.md)
* [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md)
* [Fetch via HTTP and APIs](../../guides/collect/fetch-via-http-and-apis.md)
* [Fan out with subpipelines](../../guides/route/fan-out-with-subpipelines.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
