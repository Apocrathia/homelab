# Windows Service Activity (windows_service_activity)

Windows Service Activity events report when a process interacts with the Service Control Manager.

- **Event UID**: `4`
- **Category**: System Activity
- **Extends**: [System Activity (system)](../../../classes/system.md)
- **Profiles**: [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md), [Host](../../../profiles/host.md), [OSINT](../../../profiles/osint.md), [Security Control](../../../profiles/security_control.md)

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

- `1`: `Create` - A service is created, for example by calling `CreateService`. Refer to the `win_service` attribute for details.
- `2`: `Reconfigure` - A service is reconfigured, for example by calling `ChangeServiceConfig` or `ChangeServiceConfig2`. Refer to the `win_service` attribute for details.
- `3`: `Start` - A stopped service is started, for example by calling `StartService`. Refer to the `service` attribute for details.
- `4`: `Stop` - A running or paused service is stopped, for example by calling `ControlService` or `ControlServiceEx`. Refer to the `win_service` attribute for details.
- `5`: `Pause` - A running service is paused, for example by calling `ControlService` or `ControlServiceEx`. Refer to the `win_service` attribute for details.
- `6`: `Continue` - A paused service is continued, for example by calling `ControlService` or `ControlServiceEx`. Refer to the `win_service` attribute for details.
- `7`: `Delete` - A service is deleted, for example by calling `DeleteService`. Refer to the `win_service` attribute for details.

The normalized identifier of the activity that triggered the event.

### `win_service`

- **Type**: [`win_service`](../objects/win_service.md)
- **Requirement**: required
- **Group**: primary

The Windows service.
