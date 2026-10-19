---
title: "Identify distribution drift"
description: "Find changes in coding-agent operation mix and duration distributions."
canonical: https://tenzir.com/docs/guides/analyze/identify-distribution-drift
source: https://tenzir.com/docs/guides/analyze/identify-distribution-drift.md
section: "Docs"
---

# Identify distribution drift

> Find changes in coding-agent operation mix and duration distributions.

Suppose a Claude Code rollout produces the same number of events as the previous version. No operation is invalid, and every duration remains plausible. The aggregate event count therefore looks healthy. Yet the new version performs fewer interactions, executes tools more often, introduces a `WebFetch`, and spends more time in its model request. No single-event threshold captures that change because the problem is the population’s composition.

Compare complete baseline and current distributions when you need to know whether the mix or shape changed. The example projects [OCSF API Activity events](https://schema.ocsf.io/classes/api_activity) produced by our Claude Code package. The `baseline` and `current` lists contain five events each, so a volume comparison reports no change. The common `api.operation` and `trace.span.duration` fields expose the behavioral shift. The same analysis applies to Codex events after normalization.

## Compare baseline and current distributions

The baseline contains three interactions, one model request, and one tool execution. The current population contains one interaction, one slower model request, two tool executions, and one `WebFetch`. Build [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md) models for the operations and [`tdigest`](https://tenzir.com/docs/reference/functions/tdigest.md) models for the durations.

The pipeline uses [Jensen-Shannon divergence](https://en.wikipedia.org/wiki/Jensen%E2%80%93Shannon_divergence) to compare the operation mix. For durations, [Kolmogorov-Smirnov distance](https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Smirnov_test) measures the largest gap between [cumulative distribution functions](https://en.wikipedia.org/wiki/Cumulative_distribution_function) (CDFs), while the [Wasserstein distance](https://en.wikipedia.org/wiki/Wasserstein_metric) reports the shift in milliseconds:

```tql
from {
  baseline: [
    {api: {operation: "claude_code.interaction"}, trace: {span: {duration: 1000}}},
    {api: {operation: "claude_code.interaction"}, trace: {span: {duration: 1000}}},
    {api: {operation: "claude_code.interaction"}, trace: {span: {duration: 1000}}},
    {api: {operation: "claude_code.llm_request"}, trace: {span: {duration: 1000}}},
    {api: {operation: "claude_code.tool.execution"}, trace: {span: {duration: 17}}},
  ],
  current: [
    {api: {operation: "claude_code.interaction"}, trace: {span: {duration: 1000}}},
    {api: {operation: "claude_code.llm_request"}, trace: {span: {duration: 2997}}},
    {api: {operation: "claude_code.tool.execution"}, trace: {span: {duration: 17}}},
    {api: {operation: "claude_code.tool.execution"}, trace: {span: {duration: 17}}},
    {api: {operation: "WebFetch"}, trace: {span: {duration: 1000}}},
  ],
}
operation_baseline = frequency_table(
  baseline.map(event => event.api.operation),
)
operation_current = frequency_table(
  current.map(event => event.api.operation),
)
duration_baseline = tdigest(
  baseline.map(event => event.trace.span.duration),
)
duration_current = tdigest(
  current.map(event => event.trace.span.duration),
)
select lifecycle_drift = model_divergence(
         operation_baseline,
         operation_current,
         method="jensen_shannon",
       ),
       duration_shape_change = model_distance(
         duration_baseline,
         duration_current,
         method="kolmogorov_smirnov",
       ),
       duration_shift_ms = model_distance(
         duration_baseline,
         duration_current,
         method="wasserstein",
       )
```

```tql
{
  lifecycle_drift: 0.138629436111989,
  duration_shape_change: 0.2,
  duration_shift_ms: 596.0,
}
```

The unchanged event count hid all three results. The values describe different parts of the rollout’s change:

* [`model_divergence`](https://tenzir.com/docs/reference/functions/model_divergence.md) with Jensen-Shannon divergence measures how much probability mass moved between agent operations. It ranges from `0.0` to `ln(2)` because Tenzir uses [natural logarithms](https://en.wikipedia.org/wiki/Natural_logarithm).
* [`model_distance`](https://tenzir.com/docs/reference/functions/model_distance.md) with Kolmogorov-Smirnov distance measures the largest vertical gap between the approximate CDFs. It ranges from `0.0` to `1.0`.
* The Wasserstein distance reports how far the duration distribution moved in its original unit. Here, the span durations moved by 596 ms on average.

The first comparison also supports [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md) models with identical edges. Use histograms when stable domain-specific ranges matter more than the adaptive compression of a t-digest.

When complete samples are available

When both complete samples already fit in lists, use the direct distribution functions instead of constructing models:

```tql
from {
  baseline_ms: [1000, 1000, 1000, 1000, 17],
  current_ms: [1000, 2997, 17, 17, 1000],
}
select shape_change = kolmogorov_smirnov(baseline_ms, current_ms),
       shift_ms = wasserstein(baseline_ms, current_ms),
       lifecycle_drift = jensen_shannon([3, 1, 1, 0], [1, 1, 2, 1])
```

```tql
{
  shape_change: 0.2,
  shift_ms: 596.0,
  lifecycle_drift: 0.1386294361119891,
}
```

The Jensen-Shannon vectors describe `claude_code.interaction`, `claude_code.llm_request`, `claude_code.tool.execution`, and `WebFetch` in that order. The weight vectors passed to [`jensen_shannon`](https://tenzir.com/docs/reference/functions/jensen_shannon.md) must describe the same categories in the same order. A [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md) avoids that manual alignment by joining the exact values from both models.

The [`kolmogorov_smirnov`](https://tenzir.com/docs/reference/functions/kolmogorov_smirnov.md) and [`wasserstein`](https://tenzir.com/docs/reference/functions/wasserstein.md) functions also accept duration and timestamp samples. Wasserstein distance then returns a duration. Use the model-based variants when you need bounded state, persistence, or merging.

Choose a drift threshold

A distance has no universal alert threshold. Measure distances between known normal windows first, then choose a threshold above their expected variation. Keep both population counts with the result because a large distance between two tiny samples is weak evidence.

Compare like populations. Use the same agent runtime, operation set, permission mode, time band, and histogram or t-digest configuration on both sides. Otherwise, the score may describe a change in measurement rather than a change in agent behavior.

## See also

* [Find unseen and rare values](find-unseen-and-rare-values.md)
* [Set adaptive thresholds from a baseline](set-adaptive-thresholds-from-a-baseline.md)
