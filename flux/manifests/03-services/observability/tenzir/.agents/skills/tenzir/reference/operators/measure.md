---
title: "measure"
canonical: https://tenzir.com/docs/reference/operators/measure
source: https://tenzir.com/docs/reference/operators/measure.md
section: "Docs"
---

# measure

> Replaces the input with metrics describing the input.

Replaces the input with metrics describing the input.

```tql
measure [cumulative=bool, by_schema=bool]
```

## Description

The `measure` operator yields metrics for each received batch of events or bytes using the following schema, respectively:

Events Metrics

```text
type tenzir.measure.events = record{
  timestamp: time,
  events: uint64,
  schema_id: string,
  schema: string,
}
```

Bytes Metrics

```text
type tenzir.measure.bytes = record{
  timestamp: time,
  bytes: uint64,
}
```

### `cumulative = bool (optional)`

Whether to emit running totals for the `events` and `bytes` fields rather than per-batch statistics.

### `by_schema = bool (optional)`

Whether to count events per schema. Defaults to `true`.

When `false`, the operator counts all events together and emits a single metric per batch without the `schema_id` and `schema` fields:

Events Metrics (by\_schema=false)

```text
type tenzir.measure.events = record{
  timestamp: time,
  events: uint64,
}
```

This option has no effect when measuring bytes.

## Examples

### Get the number of bytes read incrementally for a file

```tql
from_file "input.json"
measure
```

```tql
{timestamp: 2023-04-28T10:22:10.192322, bytes: 16384}
{timestamp: 2023-04-28T10:22:10.223612, bytes: 16384}
{timestamp: 2023-04-28T10:22:10.297169, bytes: 16384}
{timestamp: 2023-04-28T10:22:10.387172, bytes: 16384}
{timestamp: 2023-04-28T10:22:10.408171, bytes: 8232}
```

### Get the number of events read incrementally from a file

```tql
from_file "eve.json" {
  read_suricata
}
measure
```

```tql
{
  timestamp: 2023-04-28T10:26:45.159885,
  events: 8192,
  schema_id: "d49102998baae44a",
  schema: "suricata.dns"
}
...
{
  timestamp: 2023-04-28T10:26:45.812321,
  events: 412,
  schema_id: "d49102998baae44a",
  schema: "suricata.dns"
}
```

### Get the total number of events in a file, grouped by schema

```tql
from_file "eve.json" {
  read_suricata
}
measure
summarize schema, events=sum(events)
```

```tql
{schema: "suricata.dns", events: 65948}
```
