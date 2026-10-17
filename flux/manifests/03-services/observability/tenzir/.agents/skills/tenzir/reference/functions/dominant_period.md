---
title: "dominant_period"
canonical: https://tenzir.com/docs/reference/functions/dominant_period
source: https://tenzir.com/docs/reference/functions/dominant_period.md
section: "Docs"
---

# dominant_period

> Recovers the strongest period from a list of timestamps.

Recovers the strongest period from a list of timestamps.

```tql
dominant_period(times:list, resolution=duration) -> record
```

## Description

The `dominant_period` function detects periodic behavior in irregular event streams, such as malware beacons checking in on a timer. It bins the timestamps into a count series at the given `resolution`, computes the [autocorrelation](https://en.wikipedia.org/wiki/Autocorrelation) of that series, and picks the strongest lag. Candidate lags are ranked by the total correlation in a small window around them, which keeps a jittered fundamental period ahead of its harmonics. The result is a record with two fields:

* `period: duration`: the recovered period, a multiple of `resolution`.
* `strength: float`: the autocorrelation coefficient at that period, normalized to the range 0 to 1. Values close to 1 indicate strongly periodic behavior.

Unlike interval statistics, this survives missed check-ins, clock jitter, and a beacon overlaid on other traffic to the same endpoint.

### Definition

Given timestamps $t_1, \dots, t_n$ and resolution $\Delta$, the function first bins the timestamps into a count series of $B$ bins:

$$
c_j = \bigl| \left\{\, i : \left\lfloor (t_i - t_{\min}) / \Delta \right\rfloor = j \,\right\} \bigr|, \qquad j = 0, \dots, B-1
$$

It then computes the biased sample autocorrelation $r_k$ of the count series (the same estimator as [`autocorrelation`](https://tenzir.com/docs/reference/functions/autocorrelation.md)) and scores every candidate lag by the total correlation in a window of one lag around it:

$$
k^{*} = \operatorname{arg\,max}_{2 \le k \le B/2} \left( r_{k-1} + r_k + r_{k+1} \right)
$$

The windowed score is what makes the estimator robust to jitter: an event that lands one bin early or late moves correlation mass from lag $k$ to $k \pm 1$, where a plain argmax over $r_k$ would drift to a harmonic. The returned values are

$$
\text{period} = k^{\dagger} \Delta, \qquad \text{strength} = \max(0, r_{k^{\dagger}})
$$

where $k^\dagger$ is the strongest single lag within $\{k^* - 1, k^*, k^* + 1\}$. The lag bounds are principled: periods below $2\Delta$ are undetectable at resolution $\Delta$ (the [Nyquist limit](https://en.wikipedia.org/wiki/Nyquist_frequency)), and coefficients beyond lag $B/2$ average too few terms to be reliable.

Statistical context

This estimator combines a binned [counting process](https://en.wikipedia.org/wiki/Counting_process), its sample autocorrelation, and a smoothed peak pick. Classical alternatives are the [Lomb-Scargle periodogram](https://en.wikipedia.org/wiki/Least-squares_spectral_analysis), which handles irregular samples without binning, and Fisher’s g-test, which turns the maximum periodogram ordinate into a significance level. This function trades those for uniform period resolution at long periods and a strength value that doubles as an interpretable filter threshold.

When no meaningful period exists, the function returns `{period: null, strength: 0.0}`: this happens for fewer than two timestamps, identical timestamps, a time span shorter than about three resolution steps, or when no lag correlates positively. Filters like `strength >= 0.8` therefore work without extra `null` handling.

Detectable periods range from `2 * resolution` (the [Nyquist limit](https://en.wikipedia.org/wiki/Nyquist_frequency)) to half the time span of the input.

### `times: list`

The list of timestamps to analyze. The function returns `null` and emits a warning when the elements are not timestamps.

### `resolution = duration`

The bin width for the internal count series. The recovered period is a multiple of this value, so pick a resolution a few times smaller than the shortest period you want to detect. The time span divided by the resolution must not exceed 2^20 bins.

## Examples

### Detect a beacon in connection events

Collect per-destination timestamps and keep only strongly periodic tuples. The first destination checks in every 30 seconds, the second connects at irregular intervals:

```tql
from {dst: 10.0.0.99, t: 2024-01-01T00:00:00},
     {dst: 10.0.0.99, t: 2024-01-01T00:00:30},
     {dst: 10.0.0.99, t: 2024-01-01T00:01:00},
     {dst: 10.0.0.99, t: 2024-01-01T00:01:30},
     {dst: 10.0.0.99, t: 2024-01-01T00:02:00},
     {dst: 10.0.0.99, t: 2024-01-01T00:02:30},
     {dst: 10.0.0.99, t: 2024-01-01T00:03:00},
     {dst: 10.0.0.99, t: 2024-01-01T00:03:30},
     {dst: 172.16.0.5, t: 2024-01-01T00:00:00},
     {dst: 172.16.0.5, t: 2024-01-01T00:00:13},
     {dst: 172.16.0.5, t: 2024-01-01T00:00:47},
     {dst: 172.16.0.5, t: 2024-01-01T00:01:29},
     {dst: 172.16.0.5, t: 2024-01-01T00:02:00},
     {dst: 172.16.0.5, t: 2024-01-01T00:02:21},
     {dst: 172.16.0.5, t: 2024-01-01T00:03:10},
     {dst: 172.16.0.5, t: 2024-01-01T00:03:37}
summarize dst, times=collect(t), samples=count()
beat = times.dominant_period(resolution=5s)
where samples >= 8 and beat.strength >= 0.8
select dst, period=beat.period, strength=round(beat.strength * 100) / 100
```

```tql
{dst: 10.0.0.99, period: 30s, strength: 0.87}
```

Only the beaconing destination survives the strength filter: the irregular one scores 0.3.

### Recover a 30-second cadence

```tql
from {times: [2024-01-01T00:00:00, 2024-01-01T00:00:30, 2024-01-01T00:01:00, 2024-01-01T00:01:30, 2024-01-01T00:02:00, 2024-01-01T00:02:30, 2024-01-01T00:03:00, 2024-01-01T00:03:30]}
beat = times.dominant_period(resolution=5s)
select period = beat.period, strength = round(beat.strength * 100) / 100
```

```tql
{period: 30s, strength: 0.87}
```

## See Also

* [`autocorrelation`](https://tenzir.com/docs/reference/functions/autocorrelation.md)
* [`periodogram`](https://tenzir.com/docs/reference/functions/periodogram.md)
* [`collect`](https://tenzir.com/docs/reference/functions/collect.md)
