---
title: "chart_pie"
canonical: https://tenzir.com/docs/reference/operators/chart_pie
source: https://tenzir.com/docs/reference/operators/chart_pie.md
section: "Docs"
---

# chart_pie

> Plots events on an pie chart.

Plots events on an pie chart.

```tql
chart_pie x|label=field, y|value=any, [group=any]
```

## Description

Visualizes events with an pie chart on the [Tenzir Platform](https://app.tenzir.com).

### `x|label = field`

Name of each slice on the chart.

String, IP, subnet, and `null` labels use the order in which they first appear in the input. Use [`sort`](https://tenzir.com/docs/reference/operators/sort.md) before [`chart_pie`](https://tenzir.com/docs/reference/operators/chart_pie.md) to control the order of categorical slices.

Numeric, duration, and timestamp labels are sorted by value.

### `y|value = any`

Value of each slice on the chart. Multiple data points for the same group can be be aggregated using an [aggregation function](../functions.md#aggregation).

Multiple `y` values and their labels can be specified by using the record syntax: `{name: value, ...}`.

For example, `y = {"Avg. Load": mean(load)}` calculates the [`mean`](https://tenzir.com/docs/reference/functions/mean.md) of the `load` field and labels it as `Avg. Load`.

### `group = any (optional)`

Optional expression to group the aggregations with.

## Examples

### Chart count of events imported for every unique schema

```tql
metrics "import"
where timestamp > now() - 1d
chart_pie label=schema, value=sum(events)
```

## See Also

* [`chart_area`](https://tenzir.com/docs/reference/operators/chart_area.md)
* [`chart_bar`](https://tenzir.com/docs/reference/operators/chart_bar.md)
* [`chart_line`](https://tenzir.com/docs/reference/operators/chart_line.md)
* [Plot data with charts](../../tutorials/plot-data-with-charts.md)
