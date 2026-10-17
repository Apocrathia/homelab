# Registry Value Activity (registry_value_activity)

Registry Value Activity events reports when a process performs an action on a Windows registry value.

- **Event UID**: `2`
- **Category**: System Activity
- **Extends**: [System Activity (system)](../../../classes/system.md)
- **Profiles**: [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md), [Host](../../../profiles/host.md), [OSINT](../../../profiles/osint.md), [Security Control](../../../profiles/security_control.md)

## Associations

- `actor.user` ↔ `device`
- `device` ↔ `actor.user`

## Inherited attributes

**From System Activity:**
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

- `1`: `Get`
- `2`: `Set`
- `3`: `Modify`
- `4`: `Delete`

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../../../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the `reg_value` object.

### `prev_reg_value`

- **Type**: `reg_value`
- **Requirement**: optional

The registry value before the mutation

### `reg_value`

- **Type**: `reg_value`
- **Requirement**: required

The registry value.
