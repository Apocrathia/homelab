---
title: "Find unseen and rare values"
description: "Find agent operations and token ranges that do not occur in known-good history."
canonical: https://tenzir.com/docs/guides/analyze/find-unseen-and-rare-values
source: https://tenzir.com/docs/guides/analyze/find-unseen-and-rare-values.md
section: "Docs"
---

# Find unseen and rare values

> Find agent operations and token ranges that do not occur in known-good history.

Your coding agents can call any tool made available to them. After a plugin update, one agent calls `web_search`. The call succeeds, so status and policy checks do not flag it. What makes the event worth inspecting is that this team has never used the operation before. You need to compare it with known-good activity and carry the rarity forward as evidence.

The examples use [OCSF](https://schema.ocsf.io/) field shapes produced by our Codex and Claude Code packages. The `baseline` list represents known-good history, and `current` represents newly arriving activity. The fixtures keep only the fields that each calculation reads.

Use a [`frequency_table`](https://tenzir.com/docs/reference/functions/frequency_table.md) when exact categorical values matter and a [`histogram`](https://tenzir.com/docs/reference/functions/histogram.md) when neighboring numeric values should count as the same range. A low frequency is evidence, not a verdict. Keep the agent session, authorization decision, and other event context for the eventual decision.

## Find rare categorical values

Build a frequency table over a [categorical field](https://en.wikipedia.org/wiki/Categorical_variable) to retain how often each value appeared in the baseline. This example uses `api.operation` to score a common `Bash` event and the previously unseen `web_search` event:

```tql
from {
  baseline: [
    {class_name: "API Activity", api: {operation: "Bash"}},
    {class_name: "API Activity", api: {operation: "Bash"}},
    {class_name: "API Activity", api: {operation: "Bash"}},
    {class_name: "API Activity", api: {operation: "apply_patch"}},
    {class_name: "API Activity", api: {operation: "apply_patch"}},
    {class_name: "API Activity", api: {operation: "WebFetch"}},
  ],
  current: [
    {class_name: "API Activity", api: {operation: "Bash"}},
    {class_name: "API Activity", api: {operation: "web_search"}},
  ],
}
model = frequency_table(baseline.map(event => event.api.operation))
unroll current
seen = frequency_table_count(model, current.api.operation)
frequency = float(seen) / model.count
select tool=current.api.operation, seen, frequency
```

```tql
{tool: "Bash", seen: 3, frequency: 0.5}
{tool: "web_search", seen: 0, frequency: 0.0}
```

The [`frequency_table_count`](https://tenzir.com/docs/reference/functions/frequency_table_count.md) function returns `0` for an unseen value. Here, `web_search` is novel relative to the baseline tool mix. In the full OCSF event, `ai_agent.instance_uid` identifies the agent session and the [Security Control profile](https://schema.ocsf.io/profiles/security_control) records whether a person or policy allowed the operation.

Use `model.count` as the denominator when null inputs should not affect the frequency. Use `model.input_count` when a null observation belongs to the population that you want to measure.

## Find rare numeric ranges

Token growth can hide behind successful requests. Suppose a coding agent usually sends turns with 30,000 to 60,000 total tokens. After scanning a large repository, one turn reaches 187,400 tokens. The request has not failed, but it is far outside the agent’s recent workload and may precede a cost spike, increased latency, or context-window exhaustion. You want to surface the turn before one of those symptoms becomes the first signal.

Checking whether the exact integer `187400` appeared before would not answer that question because every prompt and response has a different length. You need to know whether the turn falls into a token range that occurs in known-good activity.

Model requests and completed responses record token consumption in `message_context.total_tokens`. This example uses 25,000-token ranges:

```tql
from {
  baseline: [
    {class_name: "API Activity", message_context: {total_tokens: 32400}},
    {class_name: "API Activity", message_context: {total_tokens: 38900}},
    {class_name: "API Activity", message_context: {total_tokens: 44200}},
    {class_name: "API Activity", message_context: {total_tokens: 47800}},
    {class_name: "API Activity", message_context: {total_tokens: 48200}},
    {class_name: "API Activity", message_context: {total_tokens: 49100}},
    {class_name: "API Activity", message_context: {total_tokens: 52600}},
    {class_name: "API Activity", message_context: {total_tokens: 58100}},
  ],
  current: [
    {class_name: "API Activity", message_context: {total_tokens: 49700}},
    {class_name: "API Activity", message_context: {total_tokens: 187400}},
  ],
}
model = histogram(
  baseline.map(event => event.message_context.total_tokens),
  bins=8,
  width=25000,
  start=0,
)
unroll current
bucket = histogram_bucket(model, current.message_context.total_tokens)
frequency = float(bucket.count) / model.count
select total_tokens=current.message_context.total_tokens,
       baseline_count=bucket.count,
       baseline_frequency=frequency,
       unseen_range=bucket.count == 0
```

```tql
{
  total_tokens: 49700,
  baseline_count: 6,
  baseline_frequency: 0.75,
  unseen_range: false,
}
{
  total_tokens: 187400,
  baseline_count: 0,
  baseline_frequency: 0.0,
  unseen_range: true,
}
```

The output keeps the evidence that a downstream policy needs: the observation, the matching baseline count and frequency, and a direct novelty flag. The 49,700-token turn falls into the 25,000-to-50,000 range, which contains six of eight baseline events. The 187,400-token turn lands in a range with no baseline observations. The `unseen_range` flag gives a live pipeline a direct condition for routing the event to review, while the count and frequency preserve the strength of the evidence.

Choose histogram boundaries

The [`histogram_bucket`](https://tenzir.com/docs/reference/functions/histogram_bucket.md) function also returns underflow and overflow buckets. Include those tail counts when values outside the represented range are valid observations rather than configuration mistakes.

Build the baseline from comparable activity, such as one agent runtime, model, and operation. Choose the bin width from the smallest difference that matters operationally. Bins that are too narrow turn harmless variation into rare buckets. Bins that are too wide hide changes that you care about. Keep the same edges for every baseline and current population that you compare.

Interpret zero counts with the baseline size

Do not treat every zero count as equally surprising. A value unseen in four observations carries less evidence than a value unseen in four million. Keep `model.count` with the frequency and require enough baseline observations before acting on it.

If downstream arithmetic takes a logarithm or multiplies frequencies, decide on a smoothing policy for zero counts. The model reports exact counts and does not choose that policy for you.

## See also

* [Set adaptive thresholds from a baseline](set-adaptive-thresholds-from-a-baseline.md)
* [Identify distribution drift](identify-distribution-drift.md)
* [Model detections in OCSF](../detect/model-detections-in-ocsf.md)
