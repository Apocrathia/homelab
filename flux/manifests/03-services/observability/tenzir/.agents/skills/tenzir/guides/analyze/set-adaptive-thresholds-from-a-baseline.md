---
title: "Set adaptive thresholds from a baseline"
description: "Set duration thresholds from each agent operation's known-good history."
canonical: https://tenzir.com/docs/guides/analyze/set-adaptive-thresholds-from-a-baseline
source: https://tenzir.com/docs/guides/analyze/set-adaptive-thresholds-from-a-baseline.md
section: "Docs"
---

# Set adaptive thresholds from a baseline

> Set duration thresholds from each agent operation's known-good history.

Suppose you want to flag slow coding-agent activity. A fixed one-second limit would classify ordinary model requests as slow, while a five-second limit could miss a serious regression in an operation that usually completes in 100 ms. Agent runtimes, models, and operations have different latency profiles, so one global threshold produces noise or hides changes.

Instead, compare a span with known-good history for the same population. The example uses a baseline of [OCSF API Activity spans](https://schema.ocsf.io/classes/api_activity) and two current spans. The code projects `trace.span.duration` from events produced by our Codex and Claude Code packages. The [Trace profile](https://schema.ocsf.io/profiles/trace) expresses the duration in milliseconds. Assume an upstream filter has selected one comparable agent and operation; the fixture omits those constant fields.

## Calculate a percentile threshold

The baseline’s upper tail reaches 2,000 ms. You want to distinguish a current one-second span that sits inside that history from a 2,997 ms span beyond it. A [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md) retains the duration distribution in bounded space. Use [`tdigest_quantile`](https://tenzir.com/docs/reference/functions/tdigest_quantile.md) to derive the [95th percentile](https://en.wikipedia.org/wiki/Percentile) (p95) boundary and [`tdigest_cdf`](https://tenzir.com/docs/reference/functions/tdigest_cdf.md) to compute each span’s [cumulative distribution function](https://en.wikipedia.org/wiki/Cumulative_distribution_function) (CDF) rank:

```tql
from {
  baseline: [
    {class_name: "API Activity", trace: {span: {duration: 17}}},
    {class_name: "API Activity", trace: {span: {duration: 100}}},
    {class_name: "API Activity", trace: {span: {duration: 373}}},
    {class_name: "API Activity", trace: {span: {duration: 1000}}},
    {class_name: "API Activity", trace: {span: {duration: 1000}}},
    {class_name: "API Activity", trace: {span: {duration: 1000}}},
    {class_name: "API Activity", trace: {span: {duration: 1000}}},
    {class_name: "API Activity", trace: {span: {duration: 2000}}},
    {class_name: "API Activity", trace: {span: {duration: 2000}}},
    {class_name: "API Activity", trace: {span: {duration: 2000}}},
  ],
  current: [
    {class_name: "API Activity", trace: {span: {duration: 1000}}},
    {class_name: "API Activity", trace: {span: {duration: 2997}}},
  ],
}
model = tdigest(baseline.map(event => event.trace.span.duration))
p95_ms = tdigest_quantile(model, 0.95)
unroll current
rank = tdigest_cdf(model, current.trace.span.duration)
select duration_ms=current.trace.span.duration,
       p95_ms,
       rank,
       exceeds_p95=current.trace.span.duration > p95_ms
```

```tql
{duration_ms: 1000, p95_ms: 2000.0, rank: 0.5, exceeds_p95: false}
{duration_ms: 2997, p95_ms: 2000.0, rank: 1.0, exceeds_p95: true}
```

The baseline-derived p95 is 2,000 ms. The one-second span has a rank of `0.5` and remains below the threshold. The 2,997 ms span exceeds every baseline observation. The quantile supplies the boundary in milliseconds, while the CDF supplies an approximate rank between `0.0` and `1.0`. Keep both so a downstream consumer can explain why the event crossed the threshold.

For a lower-tail anomaly, derive a low quantile such as `0.05`. For a two-sided policy, derive both bounds and keep observations below the low threshold or above the high threshold.

## Rank a value against a sample

Use [`ecdf`](https://tenzir.com/docs/reference/functions/ecdf.md) when the complete reference sample already fits in one list and you do not need to persist or merge it:

```tql
from {
  baseline: [
    {class_name: "API Activity", trace: {span: {duration: 17}}},
    {class_name: "API Activity", trace: {span: {duration: 100}}},
    {class_name: "API Activity", trace: {span: {duration: 373}}},
    {class_name: "API Activity", trace: {span: {duration: 1000}}},
  ],
  current: {class_name: "API Activity", trace: {span: {duration: 373}}},
}
rank = ecdf(
  baseline.map(event => event.trace.span.duration),
  current.trace.span.duration,
)
select duration_ms=current.trace.span.duration, rank
```

```tql
{duration_ms: 373, rank: 0.75}
```

The [empirical cumulative distribution function](https://en.wikipedia.org/wiki/Empirical_distribution_function) (ECDF) returns the exact fraction of sample values less than or equal to the query. In contrast, a t-digest approximates the CDF from bounded centroid state and preserves exact extrema separately.

Require enough history

A percentile does not become reliable because it has a precise decimal value. Keep the model’s `count` with the threshold and require enough observations for the tail that you query. A p99 derived from ten observations says little about the slowest one percent of agent activity.

Build separate models for populations with different behavior. Useful keys include `ai_agent.name`, `ai_agent.ai_model.name`, `api.operation`, and the Security Control disposition. Include time bands in the key when daily or weekly [seasonality](https://en.wikipedia.org/wiki/Seasonality) would otherwise mix unlike activity.

## See also

* [Find unseen and rare values](find-unseen-and-rare-values.md)
* [Identify distribution drift](identify-distribution-drift.md)
