---
title: "assert_throughput"
canonical: https://tenzir.com/docs/reference/operators/assert_throughput
source: https://tenzir.com/docs/reference/operators/assert_throughput.md
section: "Docs"
---

# assert_throughput

> Emits a warning if the pipeline is outside the expected throughput range.

Emits a warning if the pipeline is outside the expected throughput range.

```tql
assert_throughput min_events:int, within=duration,
                  [max_events=int], [retries=int]
```

## Description

The `assert_throughput` operator checks a pipeline’s throughput, emitting a warning if the minimum specified throughput is unmet or if the optional `max_events` threshold is exceeded. It optionally emits an error if the number of retries is exceeded.

### `min_events: int`

The minimum number of events expected in each `within` interval.

### `within = duration`

The interval over which the operator measures throughput. Must be a positive duration.

### `max_events = int (optional)`

The maximum number of events allowed in each `within` interval. If set, this value must be greater than or equal to `min_events`.

### `retries = int (optional)`

The number of failed interval checks to tolerate before emitting errors instead of warnings. If omitted, throughput violations emit warnings.

## Examples

### Require 1,000 events per second, failing if the issue persists for 30s

```tql
accept_udp "0.0.0.0:514"
this = data.parse_syslog()
assert_throughput 1k, within=1s, retries=30
```

### Require between 1,000 and 5,000 events per second

```tql
accept_udp "0.0.0.0:514"
this = data.parse_syslog()
assert_throughput 1k, within=1s, max_events=5k
```

## See Also

* [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md)
* [`assert`](https://tenzir.com/docs/reference/operators/assert.md)
* [`throttle`](https://tenzir.com/docs/reference/operators/throttle.md)
