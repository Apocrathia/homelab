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

### `log_facility`

- **Type**: `string_t`
- **Requirement**: optional

The syslog facility, normalized to the caption of the `log_facility_id` value. In the case of 'Other', it is defined by the event source.

### `log_facility_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `log_facility`

#### Enum values

- `0`: `kern` - Kernel messages.
- `1`: `user` - User-level messages.
- `2`: `mail` - Mail system.
- `3`: `daemon` - System daemons.
- `4`: `auth` - Security and authorization messages.
- `5`: `syslog` - Messages generated internally by the syslog process.
- `6`: `lpr` - Line printer subsystem.
- `7`: `news` - Network news subsystem.
- `8`: `uucp` - UUCP subsystem.
- `9`: `cron` - Clock daemon.
- `10`: `authpriv` - Security and authorization messages, distinguished from facility 4 by convention and conventionally reserved for privileged access.
- `11`: `ftp` - FTP daemon.
- `12`: `ntp` - NTP subsystem.
- `13`: `audit` - Log audit.
- `14`: `console` - Console messages, per the RFC 5427 SyslogFacility mapping. RFC 5424 Table 1 lists facility 14 as 'log alert'.
- `15`: `cron2` - A second cron or clock daemon facility used by some systems such as Solaris, distinct from facility 9, per the RFC 5427 SyslogFacility mapping. RFC 5424 Table 1 lists facility 15 as 'clock daemon'.
- `16`: `local0` - Local use 0.
- `17`: `local1` - Local use 1.
- `18`: `local2` - Local use 2.
- `19`: `local3` - Local use 3.
- `20`: `local4` - Local use 4.
- `21`: `local5` - Local use 5.
- `22`: `local6` - Local use 6.
- `23`: `local7` - Local use 7.
- `99`: `Other` - The facility is not mapped. See the `log_facility` attribute, which contains a data source specific value.

The facility of the source syslog message, identifying the originating subsystem that generated it. The facility is independent of severity and is not recoverable from `severity_id`. A relay may rewrite or regenerate a message, so this reflects the source (original) facility rather than a value guaranteed to be stable across hops, and it should be populated only when the source is syslog or an equivalent facility mapping is unambiguous. There is no `Unknown` value: `0` is the kernel (`kern`) facility, so an absent or malformed PRI must not be mapped to `0`; use `99` (Other) for a known nonstandard or source-defined facility.

### `log_format`

- **Type**: `string_t`
- **Requirement**: optional

The format of data in the log. For example JSON, syslog or CSV.

### `log_level`

- **Type**: `string_t`
- **Requirement**: optional

The level at which an event was logged. This can be log provider specific. For example the audit level.

### `log_name`

- **Type**: `string_t`
- **Requirement**: recommended

The log name for the logging provider log, or the file name of the system log. This may be an intermediate store-and-forward log or a vendor destination log. For example /archive/server1/var/log/messages.0 or /var/log/.

### `log_provider`

- **Type**: `string_t`
- **Requirement**: recommended

The logging provider or logging service that logged the event. This may be an intermediate application store-and-forward log or a vendor destination log.

### `log_version`

- **Type**: `string_t`
- **Requirement**: optional

The event log schema version of the original event. For example the syslog version or the Cisco Log Schema version

### `logged_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when this logger received and logged the event. For the last logger in the pipeline, this value should match `metadata.logged_time`.

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
- **Requirement**: recommended

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

The version of the logging provider.
