# Observation (observation)

A record of an observed value or event that captures the timing and frequency of its occurrence. Used to track when values/events were first detected, last detected, and their total occurrence count.

- **Extends**: [Object (object)](object.md)

## Attributes

### `value`

- **Type**: `string_t`
- **Requirement**: required

The specific value, event, indicator or data point that was observed and recorded. This is the core piece of information being tracked.

### `count`

- **Type**: `integer_t`
- **Requirement**: recommended

Integer representing the total number of times this specific value/event was observed across all occurrences. Helps establish prevalence and patterns.

### `timespan`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: recommended

The time window when the value or event was first observed. It is used to analyze activity patterns, detect trends, or correlate events within a specific timeframe.
