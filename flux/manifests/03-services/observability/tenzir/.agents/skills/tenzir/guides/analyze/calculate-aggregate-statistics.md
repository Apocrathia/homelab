---
title: "Calculate aggregate statistics"
canonical: https://tenzir.com/docs/guides/analyze/calculate-aggregate-statistics
source: https://tenzir.com/docs/guides/analyze/calculate-aggregate-statistics.md
section: "Docs"
---

# Calculate aggregate statistics

> This guide shows you how to choose and combine aggregate functions for distributions, collected values, conditions, and operational summaries. Use summarize to calculate several measures in one pass and group them by the fields that define each population.

This guide shows you how to choose and combine aggregate functions for distributions, collected values, conditions, and operational summaries. Use [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md) to calculate several measures in one pass and group them by the fields that define each population.

## Statistical functions

Use statistical aggregation functions for deeper analysis.

### Percentiles and median

Calculate distribution statistics with [`quantile`](https://tenzir.com/docs/reference/functions/quantile.md):

```tql
from {endpoint: "/api/users", latency: 120},
     {endpoint: "/api/users", latency: 135},
     {endpoint: "/api/users", latency: 110},
     {endpoint: "/api/orders", latency: 245},
     {endpoint: "/api/orders", latency: 225},
     {endpoint: "/api/orders", latency: 280}
summarize p50 = quantile(latency, q=0.5),
          p90 = quantile(latency, q=0.9),
          p95 = quantile(latency, q=0.95),
          endpoint
```

```tql
{
  p50: 245.0,
  p90: 280.0,
  p95: 280.0,
  endpoint: "/api/orders",
}
{
  p50: 120.0,
  p90: 135.0,
  p95: 135.0,
  endpoint: "/api/users",
}
```

### Standard deviation and variance

Measure data spread with [`stddev`](https://tenzir.com/docs/reference/functions/stddev.md) and [`variance`](https://tenzir.com/docs/reference/functions/variance.md):

```tql
from {server: "web1", cpu: 45},
     {server: "web1", cpu: 52},
     {server: "web1", cpu: 48},
     {server: "web2", cpu: 85},
     {server: "web2", cpu: 92},
     {server: "web2", cpu: 88}
summarize avg_cpu = mean(cpu),
          cpu_stddev = stddev(cpu),
          cpu_variance = variance(cpu),
          server
```

```tql
{
  avg_cpu: 48.333333333333336,
  cpu_stddev: 2.8674417556808622,
  cpu_variance: 8.222222222222145,
  server: "web1",
}
{
  avg_cpu: 88.33333333333333,
  cpu_stddev: 2.8674417556810217,
  cpu_variance: 8.22222222222306,
  server: "web2",
}
```

### Mode and distinct values

Find most common values and collect unique values with [`mode`](https://tenzir.com/docs/reference/functions/mode.md), [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md), and [`count_if`](https://tenzir.com/docs/reference/functions/count_if.md):

```tql
from {user: "alice", browser: "chrome", action: "login"},
     {user: "bob", browser: "firefox", action: "view"},
     {user: "alice", browser: "chrome", action: "edit"},
     {user: "charlie", browser: "chrome", action: "login"},
     {user: "alice", browser: "safari", action: "login"}
summarize most_common_browser = mode(browser),
          unique_browsers = distinct(browser),
          login_count = count_if(action, x => x == "login")
```

```tql
{
  most_common_browser: "chrome",
  unique_browsers: [
    "chrome",
    "firefox",
    "safari",
  ],
  login_count: 3,
}
```

### Value frequencies and entropy

Analyze value distributions with [`value_counts`](https://tenzir.com/docs/reference/functions/value_counts.md) and [`entropy`](https://tenzir.com/docs/reference/functions/entropy.md):

```tql
from {category: "A", value: 10},
     {category: "B", value: 20},
     {category: "A", value: 15},
     {category: "B", value: 25},
     {category: "C", value: 30}
summarize frequencies = value_counts(category),
          info_entropy = entropy(category)
```

```tql
{
  frequencies: [
    {
      value: "A",
      count: 2,
    },
    {
      value: "B",
      count: 2,
    },
    {
      value: "C",
      count: 1,
    },
  ],
  info_entropy: 1.0549201679861442,
}
```

## Preserve distributions for later analysis

Use mergeable model aggregations when a distribution must survive the current pipeline or combine with later results:

* [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md) keeps exact counts for categorical values.
* [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md) keeps exact counts for fixed numeric ranges.
* [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md) approximates a numeric distribution in bounded state.
* [`hll`](https://tenzir.com/docs/reference/functions/hll.md) estimates distinct values in bounded state.

The models are ordinary TQL records that you can query, store in lookup tables, and merge across compatible windows or partitions. Our [analysis guides](../analyze.md) show how to use them for rare values, adaptive thresholds, distribution drift, and cardinality spikes.

## Collecting values

Use [`collect`](https://tenzir.com/docs/reference/functions/collect.md) and [`distinct`](https://tenzir.com/docs/reference/functions/distinct.md) to gather values:

```tql
from {user: "alice", action: "login", timestamp: 2024-01-15T10:00:00},
     {user: "bob", action: "view", timestamp: 2024-01-15T10:01:00},
     {user: "alice", action: "edit", timestamp: 2024-01-15T10:02:00},
     {user: "charlie", action: "login", timestamp: 2024-01-15T10:03:00},
     {user: "alice", action: "logout", timestamp: 2024-01-15T10:04:00}
summarize all_actions = collect(action),
          unique_users = distinct(user),
          event_count = count()
```

```tql
{
  all_actions: [
    "login",
    "view",
    "edit",
    "login",
    "logout",
  ],
  unique_users: [
    "alice",
    "charlie",
    "bob",
  ],
  event_count: 5,
}
```

### First and last values

Get boundary values with [`first`](https://tenzir.com/docs/reference/functions/first.md) and [`last`](https://tenzir.com/docs/reference/functions/last.md):

```tql
from {sensor: "temp1", reading: 72, time: 2024-01-15T09:00:00},
     {sensor: "temp1", reading: 75, time: 2024-01-15T10:00:00},
     {sensor: "temp1", reading: 78, time: 2024-01-15T11:00:00},
     {sensor: "temp2", reading: 68, time: 2024-01-15T09:00:00},
     {sensor: "temp2", reading: 71, time: 2024-01-15T10:00:00}
summarize first_reading = first(reading),
          last_reading = last(reading),
          avg_reading = mean(reading),
          sensor
```

```tql
{
  first_reading: 72,
  last_reading: 78,
  avg_reading: 75.0,
  sensor: "temp1",
}
{
  first_reading: 68,
  last_reading: 71,
  avg_reading: 69.5,
  sensor: "temp2",
}
```

### Group and collect values

Use [`collect`](https://tenzir.com/docs/reference/functions/collect.md) with grouping to build hierarchical structures:

```tql
from {dept: "Engineering", team: "Backend", member: "Alice"},
     {dept: "Engineering", team: "Backend", member: "Bob"},
     {dept: "Engineering", team: "Frontend", member: "Charlie"},
     {dept: "Sales", team: "Direct", member: "David"}
summarize dept, team, members=collect(member)
```

```tql
{
  dept: "Sales",
  team: "Direct",
  members: [
    "David",
  ],
}
{
  dept: "Engineering",
  team: "Frontend",
  members: [
    "Charlie",
  ],
}
{
  dept: "Engineering",
  team: "Backend",
  members: [
    "Alice",
    "Bob",
  ],
}
```

## Boolean aggregations

Use [`all`](https://tenzir.com/docs/reference/functions/all.md) and [`any`](https://tenzir.com/docs/reference/functions/any.md) for boolean checks:

```tql
from {test: "unit", passed: true, duration: 45},
     {test: "integration", passed: true, duration: 120},
     {test: "e2e", passed: false, duration: 300},
     {test: "performance", passed: true, duration: 180}
summarize all_passed = all(passed),
          any_failed = any(not passed),
          total_duration = sum(duration)
```

```tql
{
  all_passed: false,
  any_failed: true,
  total_duration: 645
}
```

## Conditional aggregation

Collect values conditionally during aggregation:

```tql
from {src_ip: 10.0.0.5, dst_port: 22, bytes: 1024},
     {src_ip: 192.168.1.10, dst_port: 80, bytes: 2048},
     {src_ip: 10.0.0.5, dst_port: 443, bytes: 4096},
     {src_ip: 192.168.1.10, dst_port: 22, bytes: 512}


let $critical_ports = [22, 3389, 5985]


summarize src_ip,
  total_bytes=sum(bytes),
  // Collect all unique ports
  all_ports=collect(dst_port),
  // Collect with conditional transformation
  port_types=collect("HIGH" if dst_port in $critical_ports else "LOW")
```

```tql
{src_ip: 192.168.1.10, total_bytes: 2560, all_ports: [80, 22], port_types: ["LOW", "HIGH"]}
{src_ip: 10.0.0.5, total_bytes: 5120, all_ports: [22, 443], port_types: ["HIGH", "LOW"]}
```

This pattern enables:

* Building risk profiles during aggregation
* Transforming values during collection based on conditions
* Creating categorical metrics from raw data

## Practical examples

### Analyze API response times

```tql
from {
  requests: [
    {endpoint: "/api/users", method: "GET", duration: 45, status: 200},
    {endpoint: "/api/users", method: "POST", duration: 120, status: 201},
    {endpoint: "/api/orders", method: "GET", duration: 89, status: 200},
    {endpoint: "/api/users", method: "GET", duration: 38, status: 200},
    {endpoint: "/api/orders", method: "GET", duration: 156, status: 500}
  ]
}
unroll requests
summarize endpoint=requests.endpoint,
          count=count(),
          avg_duration=mean(requests.duration)
```

```tql
{
  endpoint: "/api/orders",
  count: 2,
  avg_duration: 122.5,
}
{
  endpoint: "/api/users",
  count: 3,
  avg_duration: 67.66666666666667,
}
```

### Calculate sales metrics

```tql
from {
  sales: [
    {date: "2024-01-01", amount: 1200, region: "North"},
    {date: "2024-01-01", amount: 800, region: "South"},
    {date: "2024-01-02", amount: 1500, region: "North"},
    {date: "2024-01-02", amount: 950, region: "South"},
    {date: "2024-01-03", amount: 1100, region: "North"}
  ]
}
// Calculate totals by date
unroll sales
summarize date=sales.date, total=sum(sales.amount)
sort date
```

```tql
{date: "2024-01-01", total: 2000}
{date: "2024-01-02", total: 2450}
{date: "2024-01-03", total: 1100}
```

### Monitor system health

```tql
from {
  metrics: [
    {timestamp: "10:00", cpu: 45, memory: 62, disk: 78},
    {timestamp: "10:01", cpu: 52, memory: 64, disk: 78},
    {timestamp: "10:02", cpu: 89, memory: 71, disk: 79},
    {timestamp: "10:03", cpu: 67, memory: 68, disk: 79},
    {timestamp: "10:04", cpu: 48, memory: 65, disk: 80}
  ]
}
cpu_alert = metrics.map(m => m.cpu > 80).any()
avg_memory = metrics.map(m => m.memory).mean()
disk_trend = metrics.last().disk - metrics.first().disk
health_summary = {
  cpu_max: metrics.map(m => m.cpu).max(),
  memory_avg: avg_memory,
  disk_growth: disk_trend,
  critical: cpu_alert
}
```

```tql
{
  metrics: [
    {timestamp: "10:00", cpu: 45, memory: 62, disk: 78},
    {timestamp: "10:01", cpu: 52, memory: 64, disk: 78},
    {timestamp: "10:02", cpu: 89, memory: 71, disk: 79},
    {timestamp: "10:03", cpu: 67, memory: 68, disk: 79},
    {timestamp: "10:04", cpu: 48, memory: 65, disk: 80},
  ],
  cpu_alert: true,
  avg_memory: 66.0,
  disk_trend: 2,
  health_summary: {
    cpu_max: 89,
    memory_avg: 66.0,
    disk_growth: 2,
    critical: true,
  },
}
```

## Complex aggregations

Combine multiple aggregation functions for comprehensive analysis:

```tql
from {method: "GET", endpoint: "/api/users", status: 200, duration: 45},
     {method: "POST", endpoint: "/api/users", status: 201, duration: 120},
     {method: "GET", endpoint: "/api/orders", status: 200, duration: 89},
     {method: "GET", endpoint: "/api/users", status: 200, duration: 38},
     {method: "GET", endpoint: "/api/orders", status: 500, duration: 156},
     {method: "DELETE", endpoint: "/api/users/123", status: 204, duration: 67}
summarize request_count = count(),
          avg_duration = mean(duration),
          error_count = count_if(status, s => s >= 400),
          unique_endpoints = count_distinct(endpoint),
          method
error_rate = error_count / request_count
```

```tql
{
  request_count: 1,
  avg_duration: 120.0,
  error_count: 0,
  unique_endpoints: 1,
  method: "POST",
  error_rate: 0.0,
}
{
  request_count: 1,
  avg_duration: 67.0,
  error_count: 0,
  unique_endpoints: 1,
  method: "DELETE",
  error_rate: 0.0,
}
{
  request_count: 4,
  avg_duration: 82.0,
  error_count: 1,
  unique_endpoints: 2,
  method: "GET",
  error_rate: 0.25,
}
```

## Best practices

1. **Choose appropriate functions**: Use [`mean`](https://tenzir.com/docs/reference/functions/mean.md) for averages, [`median`](https://tenzir.com/docs/reference/functions/median.md) for skewed data
2. **Handle empty collections**: Check if lists are empty before aggregating
3. **Consider memory usage**: Large collections can consume significant memory
4. **Combine aggregations**: Calculate multiple statistics in one pass for efficiency

## See also

* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [Aggregate event streams](aggregate-event-streams.md)
* [Shape aggregation results](shape-aggregation-results.md)
* [Shape lists](../shape/shape-lists.md)
