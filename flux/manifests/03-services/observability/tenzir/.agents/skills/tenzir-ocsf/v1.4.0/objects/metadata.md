# Metadata (metadata)

The Metadata object describes the metadata associated with the event.

- **Extends**: [Object (object)](object.md)

## Attributes

### `correlation_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier used to correlate events.

### `debug`

- **Type**: `string_t`
- **Requirement**: optional

Debug information about non-fatal issues with this OCSF event. Each issue is a line in this string array.

### `event_code`

- **Type**: `string_t`
- **Requirement**: optional

The `Event ID, Code, or Name` that the product uses to primarily identify the event.

### `extension`

- **Type**: [`extension`](extension.md)
- **Requirement**: optional

> **Deprecated since v1.1.0.** Use the `extensions` attribute instead.

The schema extension used to create the event.

### `extensions`

- **Type**: [`extension`](extension.md)
- **Requirement**: optional

The schema extensions used to create the event.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels attached to the event. For example: `["sample", "dev"]`

### `log_level`

- **Type**: `string_t`
- **Requirement**: optional

The audit level at which an event was generated.

### `log_name`

- **Type**: `string_t`
- **Requirement**: recommended

The event log name. For example, syslog file name or Windows logging subsystem: Security.

### `log_provider`

- **Type**: `string_t`
- **Requirement**: recommended

The logging provider or logging service that logged the event. For example, Microsoft-Windows-Security-Auditing.

### `log_version`

- **Type**: `string_t`
- **Requirement**: optional

The event log schema version that specifies the format of the original event. For example syslog version or Cisco Log Schema Version.

### `logged_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the logging system collected and logged the event.

This attribute is distinct from the event time in that event time typically contain the time extracted from the original event. Most of the time, these two times will be different.

### `loggers`

- **Type**: [`logger`](logger.md)
- **Requirement**: optional

An array of Logger objects that describe the devices and logging products between the event source and its eventual destination. Note, this attribute can be used when there is a complex end-to-end path of event flow.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the event was last modified or enriched.

### `original_time`

- **Type**: `string_t`
- **Requirement**: recommended

The original event time as reported by the event source. For example, the time in the original format from system event log such as Syslog on Unix/Linux and the System event file on Windows. Omit if event is generated instead of collected via logs.

### `processed_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The event processed time, such as an ETL operation.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: required

The product that reported the event.

### `profiles`

- **Type**: `string_t`
- **Requirement**: optional

The list of profiles used to create the event. Profiles should be referenced by their `name` attribute for core profiles, or `extension/name` for profiles from extensions.

### `sequence`

- **Type**: `integer_t`
- **Requirement**: optional

Sequence number of the event. The sequence number is a value available in some events, to make the exact ordering of events unambiguous, regardless of the event time precision.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the event.

### `tenant_uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique tenant identifier.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The logging system-assigned unique identifier of an event instance.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The version of the OCSF schema, using Semantic Versioning Specification ([SemVer](https://semver.org)). For example: 1.0.0. Event consumers use the version to determine the available event attributes.
