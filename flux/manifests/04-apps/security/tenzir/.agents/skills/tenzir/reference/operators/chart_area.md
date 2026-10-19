---
title: "chart_area"
canonical: https://tenzir.com/docs/reference/operators/chart_area
source: https://tenzir.com/docs/reference/operators/chart_area.md
section: "Docs"
---

# chart_area

> Plots events on an area chart.

Plots events on an area chart.

```tql
chart_area x=field, y=any, [x_min=any, x_max=any, y_min=any, y_max=any,
                            resolution=duration, fill=any, x_log=bool,
                            y_log=bool, group=any, position=string]
```

## Description

Visualizes events with an area chart on the [Tenzir Platform](https://app.tenzir.com).

### `x = field`

Positions on the x-axis for each data point.

Area charts use a continuous x-axis. Numeric, duration, and timestamp values are sorted by value before rendering.

### `y = any`

Positions on the y-axis for each data point. Multiple data points for the same group can be be aggregated using an [aggregation function](../functions.md#aggregation).

Multiple `y` values and their labels can be specified by using the record syntax: `{name: value, ...}`.

For example, `y = {"Avg. Load": mean(load)}` calculates the [`mean`](https://tenzir.com/docs/reference/functions/mean.md) of the `load` field and labels it as `Avg. Load`.

### `x_min = any (optional)`

If specified, only charts events where `x >= x_min`. If `resolution` is specified, `x_min` is *floored* to create a full bucket.

### `x_max = any (optional)`

If specified, only charts events where `x <= x_max`. If `resolution` is specified, `x_max` is *ceiled* to create a full bucket.

### `y_min = any (optional)`

If specified, any `y` values less than `y_min` will appear clipped out of the chart.

### `y_max = any (optional)`

If specified, any `y` values greater than `y_max` will appear clipped out of the chart.

### `resolution = duration (optional)`

This option can be specified to create buckets of the given resolution on the x-axis. An aggregation function must be specified to combine values in the same bucket when `resolution` is specified.

For example, if the resolution is set to `15min`, the `x` values are *floored* to create buckets of 15 minutes. Any aggregations specified act on that bucket.

### `fill = any (optional)`

Optional value to fill gaps and replace `null`s with.

### `x_log = bool (optional)`

If `true`, use a logarithmic scale for the x-axis.

Defaults to `false`.

### `y_log = bool (optional)`

If `true`, use a logarithmic scale for the y-axis.

Defaults to `false`.

### `group = any (optional)`

Optional expression to group the aggregations with.

### `position = string (optional)`

Determines how the `y` values are displayed. Possible values:

* `grouped`
* `stacked`

Defaults to `grouped`.

## Examples

### Chart TCP metrics

This pipeline charts MBs read and written by different pipelines over TCP in hourly intervals for the past 24 hours.

```tql
metrics "tcp"
chart_area x=timestamp,
    y={tx: sum(bytes_written/1M), rx: sum(bytes_read/1M)},
    x_min=now()-1d,
    resolution=1h,
    group=pipeline_id
```

## See Also

* [`chart_bar`](https://tenzir.com/docs/reference/operators/chart_bar.md)
* [`chart_line`](https://tenzir.com/docs/reference/operators/chart_line.md)
* [`chart_pie`](https://tenzir.com/docs/reference/operators/chart_pie.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
