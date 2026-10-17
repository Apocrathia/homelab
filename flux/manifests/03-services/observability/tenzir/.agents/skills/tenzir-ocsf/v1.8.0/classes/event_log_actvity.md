# Event Log Activity (event_log_actvity)

Event Log Activity events report actions pertaining to the system's event logging service(s), such as disabling logging or clearing the log data.

- **Class UID**: `1008`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `log_file`, `log_name`, `log_provider`, `log_type`, `log_type_id`

## Associations

- `actor.user` ↔ `device`
- `device` ↔ `actor.user`

## Inherited attributes

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Clear` - Clear the event log database, file, or cache.
- `2`: `Delete` - Delete the event log database, file, or cache.
- `3`: `Export` - Export the event log database, file, or cache.
- `4`: `Archive` - Archive the event log database, file, or cache.
- `5`: `Rotate` - Rotate the event log database, file, or cache.
- `6`: `Start` - Start the event logging service.
- `7`: `Stop` - Stop the event logging service.
- `8`: `Restart` - Restart the event logging service.
- `9`: `Enable` - Enable the event logging service.
- `10`: `Disable` - Disable the event logging service.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: recommended
- **Group**: primary

The actor that performed the activity.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: recommended
- **Group**: primary

The device that reported the event.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The

targeted

endpoint for the event log activity.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: recommended
- **Group**: primary

The file

targeted by

the activity. Example: `/var/log/audit.log`

### `log_name`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The name of the event log

targeted by

the activity. Example: Windows `Security`.

### `log_provider`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The logging provider or logging service

targeted by

the activity.
Example: `Microsoft-Windows-Security-Auditing`, `Auditd`, or `Syslog`.

### `log_type`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The log type, normalized to the caption of the `log_type_id` value. In the case of 'Other', it is defined by the event source.

### `log_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary
- **Sibling**: `log_type`

#### Enum values

- `0`: `Unknown` - The log type is unknown.
- `1`: `OS` - The log type is an Operating System log.
- `2`: `Application` - The log type is an Application log.
- `99`: `Other` - The log type is not mapped. See the `log_type` attribute, which contains a data source specific value.

The normalized log type identifier.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The source endpoint for the event log activity.

### `status_code`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The event status code, as reported by the event source.
Example: `0`, `8`, or `21` for [Windows ClearEventLog](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/eventlogprov/cleareventlog-method-in-class-win32-nteventlogfile).

### `status_detail`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The status detail contains additional information about the event outcome.
Example: `Success`, `Privilege Missing`, or `Invalid Parameter` for [Windows ClearEventLog](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/eventlogprov/cleareventlog-method-in-class-win32-nteventlogfile).
