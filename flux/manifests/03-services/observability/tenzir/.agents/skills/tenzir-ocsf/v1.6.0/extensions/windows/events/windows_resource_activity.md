# Windows Resource Activity (windows_resource_activity)

Windows Resource Activity events report when a process accesses a Windows managed resource object, successful or otherwise.

- **Event UID**: `3`
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

- `1`: `Access`

The normalized identifier of the activity that triggered the event.

### `win_resource`

- **Type**: [`win_resource`](../objects/win_resource.md)
- **Requirement**: required
- **Group**: primary

The Windows resource object that was accessed, such as a mutant or timer.
