# Windows Resource Activity (resource)

Windows Resource Activity events report when a process accesses a Windows managed resource object, successful or otherwise.

- **Event UID**: `3`
- **Category**: System Activity
- **Extends**: [System Activity (system)](../../../classes/system.md)
- **Profiles**: [Host](../../../profiles/host.md), [Security Control](../../../profiles/security_control.md), [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md)

## Associations

- `device` ↔ `actor.user`
- `actor.user` ↔ `device`

## Inherited attributes

**From System Activity:**
- `actor` (required)
- `device` (required)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)

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
