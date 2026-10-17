# Windows Service Activity (windows_service_activity)

Windows Service Activity events report when a process interacts with the Service Control Manager.

- **Event UID**: `4`
- **Category**: System Activity
- **Extends**: [System Activity (system)](../../../classes/system.md)
- **Profiles**: [AI Operation](../../../profiles/ai_operation.md), [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md), [Host](../../../profiles/host.md), [OSINT](../../../profiles/osint.md), [Record Integrity](../../../profiles/record_integrity.md), [Security Control](../../../profiles/security_control.md)

## Associations

- `actor.user` ↔ `device`
- `device` ↔ `actor.user`

## Inherited attributes

**From System Activity:**
- `actor` (required)
- `device` (required)

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
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create` - A service is created, for example by calling the CreateService API.
- `2`: `Reconfigure` - A service is reconfigured, for example by calling the ChangeServiceConfig or ChangeServiceConfig2 API. Refer to `prev_win_service` and `win_service` attributes for details.
- `3`: `Start` - A stopped service is started, for example by calling the StartService API.
- `4`: `Stop` - A running or paused service is stopped, for example by calling the ControlService or ControlServiceEx API.
- `5`: `Pause` - A running service is paused, for example by calling the ControlService or ControlServiceEx API.
- `6`: `Continue` - A paused service is continued, for example by calling the ControlService or ControlServiceEx API.
- `7`: `Delete` - A service is deleted, for example by calling the DeleteService API.

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use 0 (Unknown) when the activity cannot be determined. Use 99 (Other) when the activity does not match any defined value, in which case activity_name must be populated with the source-specific label.
Refer to the `win_service` attribute for details, unless any other attribute is mentioned.

### `prev_win_service`

- **Type**: [`win_service`](../objects/win_service.md)
- **Requirement**: recommended
- **Group**: primary

The Windows service before the mutation.

### `win_service`

- **Type**: [`win_service`](../objects/win_service.md)
- **Requirement**: required
- **Group**: primary

The current Windows service. On failed or unknown status of `Reconfigure` action may be populated with the intended state.
