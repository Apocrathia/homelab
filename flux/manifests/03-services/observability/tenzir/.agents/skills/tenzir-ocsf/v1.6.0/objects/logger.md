# Logger (logger)

The Logger object represents the device and product where events are stored with times for receipt and transmission.  This may be at the source device where the event occurred, a remote scanning device, intermediate hops, or the ultimate destination.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `device`

- **Type**: [`device`](device.md)
- **Requirement**: recommended

The device where the events are logged.

### `event_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the event assigned by the logger.

### `is_truncated`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the OCSF event data has been truncated due to size limitations. When `true`, some event data may have been omitted to fit within system constraints.

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
- **Requirement**: recommended

The time when the logging system collected and logged the event.

This attribute is distinct from the event time in that event time typically contain the time extracted from the original event. Most of the time, these two times will be different.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the logging product instance.

### `product`

- **Type**: [`product`](product.md)
- **Requirement**: recommended

The product logging the event.  This may be the event source product, a management server product, a scanning product, a SIEM, etc.

### `transmit_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the event was transmitted from the logging device to it's next destination.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the logging product instance.

### `untruncated_size`

- **Type**: `integer_t`
- **Requirement**: optional

The original size of the OCSF event data in kilobytes before any truncation occurred. This field is typically populated when `is_truncated` is `true` to indicate the full size of the original event.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the logging product.
