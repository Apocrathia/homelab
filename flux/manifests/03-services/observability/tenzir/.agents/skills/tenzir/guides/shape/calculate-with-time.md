---
title: "Calculate with time"
description: "Extract calendar fields, build and convert durations, perform time arithmetic, round timestamps, and produce Unix epochs"
canonical: https://tenzir.com/docs/guides/shape/calculate-with-time
source: https://tenzir.com/docs/guides/shape/calculate-with-time.md
section: "Docs"
---

# Calculate with time

> Extract calendar fields, build and convert durations, perform time arithmetic, round timestamps, and produce Unix epochs

TQL represents a point in time as `time` and an interval as `duration`. Once a source timestamp has the `time` type, you can extract its calendar components, calculate intervals, round it to a boundary, or convert it to a numeric Unix epoch.

Follow the guide on [normalizing event timestamps](normalize-event-timestamps.md) first when a source stores timestamps as strings or numbers.

## Understand time types

A `time` value identifies one point in time. A `duration` value measures the interval between two points or an amount to add or subtract:

```tql
from {
  timestamp: 2024-01-15T10:30:45.123456,
  interval: 5min,
}
later = timestamp + interval
earlier = timestamp - 2h
```

```tql
{
  timestamp: 2024-01-15T10:30:45.123456Z,
  interval: 5min,
  later: 2024-01-15T10:35:45.123456Z,
  earlier: 2024-01-15T08:30:45.123456Z,
}
```

## Get the current time

Use [`now`](https://tenzir.com/docs/reference/functions/now.md) to get the current timestamp:

```tql
from {current_time: now()}
```

Call `now()` once and store the result when several calculations in one event must use the same instant.

## Format time to strings

Use [`format_time`](https://tenzir.com/docs/reference/functions/format_time.md) when a destination requires a timestamp string with a specific layout:

```tql
from {event_time: 2024-01-15T10:30:45.123456}
iso = event_time.format_time("%Y-%m-%dT%H:%M:%S%z")
date_only = event_time.format_time("%Y-%m-%d")
```

Keep the original `time` value for comparisons, arithmetic, ordering, and windowing. Formatting removes the type information those operations need.

## Extract time components

Use [`year`](https://tenzir.com/docs/reference/functions/year.md), [`month`](https://tenzir.com/docs/reference/functions/month.md), [`day`](https://tenzir.com/docs/reference/functions/day.md), [`hour`](https://tenzir.com/docs/reference/functions/hour.md), [`minute`](https://tenzir.com/docs/reference/functions/minute.md), and [`second`](https://tenzir.com/docs/reference/functions/second.md) to extract calendar and clock fields:

```tql
from {timestamp: 2024-01-15T10:30:45.123456}
year = timestamp.year()
month = timestamp.month()
day = timestamp.day()
hour = timestamp.hour()
minute = timestamp.minute()
second = timestamp.second()
```

```tql
{
  timestamp: 2024-01-15T10:30:45.123456Z,
  year: 2024,
  month: 1,
  day: 15,
  hour: 10,
  minute: 30,
  second: 45.123456,
}
```

## Work with durations

Subtract two `time` values to calculate a `duration`. Duration functions convert that interval to a numeric count in the selected unit:

```tql
from {
  start: 2024-01-15T10:00:00,
  end: 2024-01-15T14:30:00,
}
elapsed = end - start
hours = elapsed.count_hours()
minutes = elapsed.count_minutes()
```

```tql
{
  start: 2024-01-15T10:00:00Z,
  end: 2024-01-15T14:30:00Z,
  elapsed: 4.5h,
  hours: 4.5,
  minutes: 270.0,
}
```

### Count duration components

The `count_*` functions return the complete duration expressed in one unit. They do not return the remainder after larger units:

```tql
from {duration: 1d + 2h + 30min}
days = duration.count_days()
hours = duration.count_hours()
minutes = duration.count_minutes()
```

```tql
{
  duration: 1.1041666666666667d,
  days: 1.1041666666666667,
  hours: 26.5,
  minutes: 1590.0,
}
```

Available conversions include years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, and nanoseconds.

### Convert between time units

Choose the `count_*` function for the unit required by a calculation or output:

```tql
from {timeout: 90min}
timeout_seconds = timeout.count_seconds()
timeout_hours = timeout.count_hours()
```

Use [`duration`](https://tenzir.com/docs/reference/functions/duration.md) when a string contains a duration that you need to parse:

```tql
from {timeout: "2.5h"}
timeout = timeout.duration()
```

### Create durations

Use a duration literal when the value is fixed. Use a unit function when an integer or floating-point value supplies the amount:

```tql
from {
  fixed: 5min,
  seconds: 90,
  hours: 2.5,
}
from_seconds = seconds.seconds()
from_hours = hours.hours()
```

```tql
{
  fixed: 5min,
  seconds: 90,
  hours: 2.5,
  from_seconds: 1.5min,
  from_hours: 2.5h,
}
```

The duration literal suffixes are `ns`, `us`, `ms`, `s`, `min`, `h`, `d`, `w`, and `y`.

## Calculate time differences

Subtract the earlier timestamp from the later timestamp, then convert the result only when you need a numeric unit:

```tql
from {
  login: 2024-01-15T09:00:00,
  first_action: 2024-01-15T09:05:30,
  logout: 2024-01-15T17:30:00,
}
time_to_action = first_action - login
session_duration = logout - login
active_hours = session_duration.count_hours()
```

```tql
{
  login: 2024-01-15T09:00:00Z,
  first_action: 2024-01-15T09:05:30Z,
  logout: 2024-01-15T17:30:00Z,
  time_to_action: 5.5min,
  session_duration: 8.5h,
  active_hours: 8.5,
}
```

## Add and subtract time

Add or subtract a duration to move a timestamp:

```tql
from {event_time: 2024-01-15T10:30:00}
one_hour_later = event_time + 1h
yesterday = event_time - 1d
next_week = event_time + 7d
```

```tql
{
  event_time: 2024-01-15T10:30:00Z,
  one_hour_later: 2024-01-15T11:30:00Z,
  yesterday: 2024-01-14T10:30:00Z,
  next_week: 2024-01-22T10:30:00Z,
}
```

## Round timestamps

The `round` method rounds a timestamp to the nearest multiple of a duration:

```tql
from {precise_time: 2024-01-15T10:37:42.847621}
to_minute = precise_time.round(1min)
to_hour = precise_time.round(1h)
to_day = precise_time.round(1d)
to_5min = precise_time.round(5min)
```

```tql
{
  precise_time: 2024-01-15T10:37:42.847621Z,
  to_minute: 2024-01-15T10:38:00Z,
  to_hour: 2024-01-15T11:00:00Z,
  to_day: 2024-01-15T00:00:00Z,
  to_5min: 2024-01-15T10:40:00Z,
}
```

The intervals align to the Unix epoch. Rounding to `1d` therefore uses UTC day boundaries.

## Convert Unix timestamps

Use the normalization guide to parse string or numeric Unix epochs into `time` values. Use [`since_epoch`](https://tenzir.com/docs/reference/functions/since_epoch.md) for the reverse conversion.

### Parse Unix timestamps

Follow [the Unix epoch normalization examples](normalize-event-timestamps.md#convert-numeric-unix-epochs) for strings and numeric values. A numeric epoch does not identify whether its unit is seconds, milliseconds, or another duration unit, so apply the unit from the source contract.

### Convert numeric timestamps

Multiply the numeric value by its duration unit, then call [`from_epoch`](https://tenzir.com/docs/reference/functions/from_epoch.md):

```tql
from {unix_millis: 1705316445123}
timestamp = from_epoch(unix_millis * 1ms)
```

```tql
{
  unix_millis: 1705316445123,
  timestamp: 2024-01-15T11:00:45.123Z,
}
```

### Convert back to Unix timestamp

Use [`since_epoch`](https://tenzir.com/docs/reference/functions/since_epoch.md) to get the duration since January 1, 1970. Convert that duration to the unit required by the destination:

```tql
from {timestamp: 2024-01-15T11:00:45Z}
unix_seconds = timestamp.since_epoch().count_seconds()
unix_millis = timestamp.since_epoch().count_milliseconds()
```

```tql
{
  timestamp: 2024-01-15T11:00:45Z,
  unix_seconds: 1705316445.0,
  unix_millis: 1705316445000.0,
}
```

## See also

* [Normalize event timestamps](normalize-event-timestamps.md)
* [Window event streams](../analyze/window-event-streams.md)
