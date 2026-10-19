# Trace (trace)

The Trace Profile extends the OCSF framework to capture and standardize observability events, specifically targeting trace-level data. This profile enables integration and normalization of distributed tracing information, allowing OCSF events to retain essential trace context such as trace IDs, span relationships, and service dependencies.

## Applies to

- API Activity
- HTTP Activity

## Attributes

### `trace`

- **Type**: [`trace`](../objects/trace.md)
- **Requirement**: recommended

The trace object contains information about distributed traces which are critical to observability and describe how requests move through a system, capturing each step's timing and status.
