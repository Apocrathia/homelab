---
title: "Aggregate event streams"
canonical: https://tenzir.com/docs/guides/analyze/aggregate-event-streams
source: https://tenzir.com/docs/guides/analyze/aggregate-event-streams.md
section: "Docs"
---

# Aggregate event streams

> This guide shows you how to produce compact aggregate records with summarize. You’ll learn to count events, calculate basic measures, and maintain separate aggregate state for each group before choosing a more specialized aggregation task.

This guide shows you how to produce compact aggregate records with [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md). You’ll learn to count events, calculate basic measures, and maintain separate aggregate state for each group before choosing a more specialized aggregation task.

## Understanding the summarize operator

The [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) operator groups events and applies aggregation functions. Its syntax is:

```plaintext
summarize <aggregation>, <aggregation>, ..., <group>, <group>, ...
```

Where:

* Aggregations are expressions like [`sum`](https://tenzir.com/docs/reference/functions/sum.md), [`count`](https://tenzir.com/docs/reference/functions/count.md), [`mean`](https://tenzir.com/docs/reference/functions/mean.md), etc.
* Groups are field names to group by

## Basic aggregations

Start with fundamental aggregation functions on event streams.

### Count events

Count total events and unique values with [`count`](https://tenzir.com/docs/reference/functions/count.md) and [`count_distinct`](https://tenzir.com/docs/reference/functions/count_distinct.md):

```tql
from {product: "apple", price: 100, category: "fruit"},
     {product: "banana", price: 250, category: "fruit"},
     {product: "carrot", price: 175, category: "vegetable"},
     {product: "apple", price: 120, category: "fruit"},
     {product: "banana", price: 225, category: "fruit"}
summarize total_count = count(), unique_products = count_distinct(product)
```

```tql
{
  total_count: 5,
  unique_products: 3
}
```

### Sum and average

Calculate totals and averages:

```tql
from {product: "apple", price: 100, quantity: 2},
     {product: "banana", price: 250, quantity: 1},
     {product: "carrot", price: 175, quantity: 3},
     {product: "apple", price: 120, quantity: 2},
     {product: "banana", price: 225, quantity: 1}
summarize total_revenue = sum(price * quantity), avg_price = mean(price), total_quantity = sum(quantity)
```

```tql
{
  total_revenue: 1440,
  avg_price: 174.0,
  total_quantity: 9
}
```

### Min and max

Find extreme values with [`min`](https://tenzir.com/docs/reference/functions/min.md) and [`max`](https://tenzir.com/docs/reference/functions/max.md):

```tql
from {sensor: "A", temperature: 72, timestamp: 2024-01-15T10:00:00},
     {sensor: "B", temperature: 68, timestamp: 2024-01-15T10:05:00},
     {sensor: "A", temperature: 75, timestamp: 2024-01-15T10:10:00},
     {sensor: "B", temperature: 82, timestamp: 2024-01-15T10:15:00},
     {sensor: "A", temperature: 71, timestamp: 2024-01-15T10:20:00}
summarize min_temp = min(temperature), max_temp = max(temperature), earliest = min(timestamp), latest = max(timestamp)
```

```tql
{
  min_temp: 68,
  max_temp: 82,
  earliest: 2024-01-15T10:00:00.000000,
  latest: 2024-01-15T10:20:00.000000
}
```

## Grouping data

Group events by one or more fields to calculate aggregations per group.

### Group by single field

Calculate statistics per category:

```tql
from {product: "apple", price: 100, category: "fruit"},
     {product: "banana", price: 250, category: "fruit"},
     {product: "carrot", price: 175, category: "vegetable"},
     {product: "lettuce", price: 125, category: "vegetable"},
     {product: "orange", price: 225, category: "fruit"}
summarize avg_price = mean(price), item_count = count(), category
```

```tql
{
  avg_price: 191.66666666666666,
  item_count: 3,
  category: "fruit",
}
{
  avg_price: 150.0,
  item_count: 2,
  category: "vegetable",
}
```

### Group by multiple fields

Group by multiple dimensions:

```tql
from {user: "alice", action: "login", duration: 45, date: "2024-01-15"},
     {user: "bob", action: "login", duration: 38, date: "2024-01-15"},
     {user: "alice", action: "view", duration: 12, date: "2024-01-15"},
     {user: "alice", action: "login", duration: 52, date: "2024-01-16"},
     {user: "bob", action: "edit", duration: 89, date: "2024-01-16"}
summarize avg_duration = mean(duration), action_count = count(), user, action
```

```tql
{
  avg_duration: 38.0,
  action_count: 1,
  user: "bob",
  action: "login",
}
{
  avg_duration: 89.0,
  action_count: 1,
  user: "bob",
  action: "edit",
}
{
  avg_duration: 48.5,
  action_count: 2,
  user: "alice",
  action: "login",
}
{
  avg_duration: 12.0,
  action_count: 1,
  user: "alice",
  action: "view",
}
```

## Choose your next task

Aggregation becomes more specific when you need to preserve input events, bound state, or choose a statistical measure:

* To preserve selected or all input events while attaching aggregate values, continue with [shaping aggregation results](shape-aggregation-results.md).
* To bound an aggregation by event time, processing time, or event count, continue with [windowing event streams](window-event-streams.md).
* To choose functions for distributions, collected values, boolean conditions, and richer summaries, continue with [calculating aggregate statistics](calculate-aggregate-statistics.md).

## See also

* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [Shape aggregation results](shape-aggregation-results.md)
* [Window event streams](window-event-streams.md)
* [Calculate aggregate statistics](calculate-aggregate-statistics.md)
