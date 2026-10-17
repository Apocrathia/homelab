# Metadata (metadata)

The Metadata object describes the metadata associated with the event.

- **Extends**: [Object (object)](object.md)

## Attributes

### `correlation_uid`

- **Type**: `string_t`
- **Requirement**: optional

A unique identifier used to correlate this OCSF event with other related OCSF events, distinct from the event's `uid` value. This enables linking multiple OCSF events that are part of the same activity, transaction, or security incident across different systems or time periods.

### `debug`

- **Type**: `string_t`
- **Requirement**: optional

Debug information about non-fatal issues with this OCSF event. Each issue is a line in this string array.

### `event_code`

- **Type**: `string_t`
- **Requirement**: optional

The identifier of the original event. For example the numerical Windows Event Code or Cisco syslog code.

### `extension`

- **Type**: [`extension`](extension.md)
- **Requirement**: optional

> **Deprecated since v1.1.0.** Use the `extensions` attribute instead.

The schema extension used to create the event.

### `extensions`

- **Type**: [`extension`](extension.md)
- **Requirement**: optional

The schema extensions used to create the event.

### `is_truncated`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the OCSF event data has been truncated due to size limitations. When `true`, some event data may have been omitted to fit within system constraints.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels attached to the event. For example: `["sample", "dev"]`

### `log_format`

- **Type**: `string_t`
- **Requirement**: optional

The format of data in the log where the data originated. For example CSV, XML, Windows Multiline, JSON, syslog or Cisco Log Schema.

### `log_level`

- **Type**: `string_t`
- **Requirement**: optional

The level at which an event was logged. This can be log provider specific. For example the audit level.

### `log_name`

- **Type**: `string_t`
- **Requirement**: recommended

The event log name, typically for the consumer of the event. For example, the storage bucket name, SIEM repository index name, etc.

### `log_provider`

- **Type**: `string_t`
- **Requirement**: optional

The logging provider or logging service that logged the event. For example AWS CloudWatch or Splunk.

### `log_source`

- **Type**: `string_t`
- **Requirement**: optional

The log system or component where the data originated. For example, a file path, syslog server name or a Windows hostname and logging subsystem such as Security.

### `log_version`

- **Type**: `string_t`
- **Requirement**: optional

The event log schema version of the original event. For example the syslog version or the Cisco Log Schema version

### `logged_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the logging system collected and logged the event.

This attribute is distinct from the event time in that event time typically contain the time extracted from the original event. Most of the time, these two times will be different.

### `loggers`

- **Type**: [`logger`](logger.md)
- **Requirement**: optional

An array of Logger objects that describe the pipeline of devices and logging products between the event source and its eventual destination. Note, this attribute can be used when there is a complex end-to-end path of event flow and/or to track the chain of custody of the data.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the event was last modified or enriched.

### `original_event_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier assigned to the event in its original logging system before transformation to OCSF format. This field preserves the source system's native event identifier, enabling traceability back to the raw log entry. For example, a Windows Event Record ID, a syslog message ID, a Splunk _cd value, or a database transaction log sequence number.

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

### `reporter`

- **Type**: [`reporter`](reporter.md)
- **Requirement**: recommended

The entity from which the event or finding was first reported.

### `sequence`

- **Type**: `integer_t`
- **Requirement**: optional

Sequence number of the event. The sequence number is a value available in some events, to make the exact ordering of events unambiguous, regardless of the event time precision.

### `source`

- **Type**: `string_t`
- **Requirement**: optional

The source of the event or finding. This can be any distinguishing name for the logical origin of the data — for example, 'CloudTrail Events', or a use case like 'Attack Simulations' or 'Vulnerability Scans'.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the event.

### `tenant_uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique tenant identifier.

### `total_queued_duration`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The amount of time an event spent in a queue awaiting processing. In this case, the value is the difference between `processed_time` and `logged_time`. This duration is inclusive of all queues between the originator of the event and the intended long-term storage destination of the event.

### `transformation_info_list`

- **Type**: [`transformation_info`](transformation_info.md)
- **Requirement**: optional

An array of transformation info that describes the mappings or transforms applied to the data.

### `transmit_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the event was transmitted from the logging device to it's next destination.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the event or finding as a subset of the `source` of the event. This can be any distinguishing characteristic of the data. For example 'Management Events' or 'Device Penetration Test'.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

A unique identifier assigned to the OCSF event. This ID is specific to the OCSF event itself and is distinct from the original event identifier in the source system (see `original_event_uid`).

### `untruncated_size`

- **Type**: `integer_t`
- **Requirement**: optional

The original size of the OCSF event data in kilobytes before any truncation occurred. This field is typically populated when `is_truncated` is `true` to indicate the full size of the original event.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The version of the OCSF schema, using Semantic Versioning Specification ([SemVer](https://semver.org)). For example: `1.0.0.` Event consumers use the version to determine the available event attributes.
