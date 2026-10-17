---
title: "Work with time"
canonical: https://tenzir.com/docs/guides/shape/work-with-time
source: https://tenzir.com/docs/guides/shape/work-with-time.md
section: "Docs"
---

# Work with time

> We split this guide into focused tasks. Existing links still open the matching section on this page, where you can continue to the current guide:

We split this guide into focused tasks. Existing links still open the matching section on this page, where you can continue to the current guide:

* [Normalize event timestamps](normalize-event-timestamps.md) to parse strings, custom formats, and Unix epochs.
* [Calculate with time](calculate-with-time.md) to extract components, work with durations, perform arithmetic, round timestamps, and produce Unix epochs.
* [Replay historical events](../replay/replay-historical-events.md) to shift timestamps and pace stored events.

## Understand time types

The guide on [calculating with time](calculate-with-time.md#understand-time-types) explains the `time` and `duration` types.

## Get the current time

The guide on [calculating with time](calculate-with-time.md#get-the-current-time) shows how to call `now()`.

## Parse time from strings

The guide on [normalizing event timestamps](normalize-event-timestamps.md#parse-common-timestamp-strings) shows how to parse standard and custom timestamp strings.

## Format time to strings

The guide on [calculating with time](calculate-with-time.md#format-time-to-strings) shows how to format timestamps at an output boundary.

## Extract time components

The guide on [calculating with time](calculate-with-time.md#extract-time-components) shows how to extract calendar and clock fields.

## Work with durations

The guide on [calculating with time](calculate-with-time.md#work-with-durations) shows how to construct and convert durations.

## Calculate time differences

The guide on [calculating with time](calculate-with-time.md#calculate-time-differences) shows how to measure elapsed time.

## Add and subtract time

The guide on [calculating with time](calculate-with-time.md#add-and-subtract-time) shows timestamp arithmetic.

## Round timestamps

The guide on [calculating with time](calculate-with-time.md#round-timestamps) shows how timestamp rounding aligns to the Unix epoch.

## Convert Unix timestamps

The guides on [normalizing Unix epochs](normalize-event-timestamps.md#convert-numeric-unix-epochs) and [producing Unix epochs](calculate-with-time.md#convert-unix-timestamps) cover both conversion directions.

## Practical examples

The calculation and normalization guides contain focused examples for the current time functions.

## Replay and adjust time series

The guide on [replaying historical events](../replay/replay-historical-events.md) shows how to order stored events, shift their timestamps, and reproduce their cadence.

## Best practices

Keep timestamps as typed `time` values inside a pipeline. Normalize them near the source, perform calculations on typed values, and format them only when a destination requires a string.
