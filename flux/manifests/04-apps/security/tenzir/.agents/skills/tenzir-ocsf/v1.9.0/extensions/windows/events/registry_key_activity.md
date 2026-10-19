# Registry Key Activity (registry_key_activity)

Registry Key Activity events report when a process performs an action on a Windows registry key.

- **Event UID**: `1`
- **Category**: System Activity
- **Extends**: [System Activity (system)](../../../classes/system.md)
- **Profiles**: [AI Operation](../../../profiles/ai_operation.md), [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md), [Host](../../../profiles/host.md), [OSINT](../../../profiles/osint.md), [Record Integrity](../../../profiles/record_integrity.md), [Security Control](../../../profiles/security_control.md)

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

### `access_mask`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The access mask in a platform-native format.

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Create`
- `2`: `Read`
- `3`: `Modify`
- `4`: `Delete`
- `5`: `Rename`
- `6`: `Set Security`
- `7`: `Restore`
- `8`: `Import`
- `9`: `Export`

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `actor`

- **Type**: [`actor`](../../../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the `reg_key` object.

### `create_mask`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The original Windows mask that is required to create the object.

### `open_mask`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The Windows options needed to open a registry key.

### `prev_reg_key`

- **Type**: `reg_key`
- **Requirement**: recommended
- **Group**: primary

The registry key before the mutation

### `reg_key`

- **Type**: `reg_key`
- **Requirement**: required
- **Group**: primary

The registry key.
