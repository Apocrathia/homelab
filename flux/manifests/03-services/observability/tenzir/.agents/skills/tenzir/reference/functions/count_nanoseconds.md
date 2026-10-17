---
title: "count_nanoseconds"
canonical: https://tenzir.com/docs/reference/functions/count_nanoseconds
source: https://tenzir.com/docs/reference/functions/count_nanoseconds.md
section: "Docs"
---

# count_nanoseconds

> Counts the number of nanoseconds in a duration.

Counts the number of `nanoseconds` in a duration.

```tql
count_nanoseconds(x:duration) -> int
```

## Description

This function returns the number of nanoseconds in a duration, i.e., `duration / 1ns`.

### `x: duration`

The duration to count in.

## See Also

[`count_years`](https://tenzir.com/docs/reference/functions/count_years.md), [`count_months`](https://tenzir.com/docs/reference/functions/count_months.md), [`count_weeks`](https://tenzir.com/docs/reference/functions/count_weeks.md), [`count_days`](https://tenzir.com/docs/reference/functions/count_days.md), [`count_hours`](https://tenzir.com/docs/reference/functions/count_hours.md), [`count_minutes`](https://tenzir.com/docs/reference/functions/count_minutes.md), [`count_seconds`](https://tenzir.com/docs/reference/functions/count_seconds.md), [`count_milliseconds`](https://tenzir.com/docs/reference/functions/count_milliseconds.md), [`count_microseconds`](https://tenzir.com/docs/reference/functions/count_microseconds.md), [`count_nanoseconds`](https://tenzir.com/docs/reference/functions/count_nanoseconds.md)
