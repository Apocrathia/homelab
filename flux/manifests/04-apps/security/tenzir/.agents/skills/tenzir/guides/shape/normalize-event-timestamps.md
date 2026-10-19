---
title: "Normalize event timestamps"
description: "Convert source timestamps into consistent time values for filtering, windows, ordering, and output"
canonical: https://tenzir.com/docs/guides/shape/normalize-event-timestamps
source: https://tenzir.com/docs/guides/shape/normalize-event-timestamps.md
section: "Docs"
---

# Normalize event timestamps

> Convert source timestamps into consistent time values for filtering, windows, ordering, and output

Sources encode timestamps as ISO 8601 strings, local date formats, Unix epoch numbers, or incomplete values without a year or time zone. Normalize them to the TQL `time` type near the start of a pipeline so later operators use one representation.

This guide shows how to parse the common source shapes, preserve the original value, and check the result before relying on it.

## Preserve the source value

Keep the original timestamp when you may need it for troubleshooting or schema mapping:

```tql
from {timestamp: "2024-01-15T10:30:45+02:00"}
raw_timestamp = timestamp
time = timestamp.time()
drop timestamp
```

```tql
{
  raw_timestamp: "2024-01-15T10:30:45+02:00",
  time: 2024-01-15T08:30:45Z,
}
```

The parsed value represents one absolute point in time. Tenzir displays time values in UTC.

## Parse common timestamp strings

Use [`time`](https://tenzir.com/docs/reference/functions/time.md) when the source uses ISO 8601, a Unix timestamp prefixed with `@`, or another supported standard form:

```tql
from {
  iso: "2024-01-15T10:30:45Z",
  offset: "2024-01-15T10:30:45-05:00",
  epoch: "@1705316445.123",
}
iso = iso.time()
offset = offset.time()
epoch = epoch.time()
```

```tql
{
  iso: 2024-01-15T10:30:45Z,
  offset: 2024-01-15T15:30:45Z,
  epoch: 2024-01-15T11:00:45.123Z,
}
```

Use this form when the source format can vary between the supported forms. An unrecognized value produces `null` and a warning.

## Parse a known custom format

Use [`parse_time`](https://tenzir.com/docs/reference/functions/parse_time.md) when the source has one known layout. An explicit format prevents ambiguous values such as `10/11/2024` from changing meaning between producers:

```tql
from {timestamp: "15/01/2024 10:30:45 +0200"}
time = timestamp.parse_time("%d/%m/%Y %H:%M:%S %z")
```

```tql
{
  timestamp: "15/01/2024 10:30:45 +0200",
  time: 2024-01-15T08:30:45Z,
}
```

Include `%z` when the input carries a UTC offset. If the sender uses local time without an offset, append the known offset before parsing rather than silently assuming that every sender uses UTC.

## Complete timestamps that omit the year

BSD Syslog timestamps contain a month, day, and time but no year. Pass a reference time so `parse_time` can choose the closest matching date:

```tql
from {timestamp: "Dec 31 23:59:59"}
time = timestamp.parse_time(
  "%b %e %H:%M:%S",
  reference=2026-02-01T00:00:00Z,
)
```

```tql
{
  timestamp: "Dec 31 23:59:59",
  time: 2025-12-31T23:59:59Z,
}
```

Use `reference=now()` for live ingestion. Use a timestamp from the archived batch when reprocessing historical data so the result does not depend on the current year.

## Convert numeric Unix epochs

A numeric epoch does not carry its unit. Apply the source unit as a duration, then use [`from_epoch`](https://tenzir.com/docs/reference/functions/from_epoch.md):

```tql
from {
  seconds: 1705316445,
  milliseconds: 1705316445123,
  microseconds: 1705316445123456,
}
seconds = from_epoch(seconds * 1s)
milliseconds = from_epoch(milliseconds * 1ms)
microseconds = from_epoch(microseconds * 1us)
```

```tql
{
  seconds: 2024-01-15T11:00:45Z,
  milliseconds: 2024-01-15T11:00:45.123Z,
  microseconds: 2024-01-15T11:00:45.123456Z,
}
```

Do not infer the unit from the number of digits unless the source contract explicitly permits that heuristic.

## Check the result before replacing a field

Parse into a temporary field first when invalid values need separate handling:

```tql
parsed_time = timestamp.time()
where parsed_time != null
time = parsed_time
drop parsed_time
```

The `where` removes events whose timestamp could not be parsed. Omit it when a null timestamp is acceptable downstream. Operators that require time values, such as [`format_time`](https://tenzir.com/docs/reference/functions/format_time.md) and event-time windows, otherwise need their own null handling.

## Format timestamps only at an output boundary

Keep timestamps as `time` values while filtering, comparing, ordering, and windowing. Convert them to strings only when a destination requires a specific layout:

```tql
formatted_time = time.format_time("%Y-%m-%dT%H:%M:%S%z")
```

String formatting discards the type information that event-time operators use. If a destination accepts native timestamps, send the `time` value directly.

## Continue with event-time processing

After normalization, choose the next task:

* Follow [repairing out-of-order events](repair-out-of-order-events.md) when nearby timestamps can regress and downstream logic depends on sequence.
* Follow [windowing event streams](../analyze/window-event-streams.md) for event-time aggregation and late-event tolerance.
* Follow [replaying historical events](../replay/replay-historical-events.md) to shift and pace stored telemetry.

## See also

* [Transform values](transform-values.md)
* [Clean up values](../parse/clean-up-values.md)
