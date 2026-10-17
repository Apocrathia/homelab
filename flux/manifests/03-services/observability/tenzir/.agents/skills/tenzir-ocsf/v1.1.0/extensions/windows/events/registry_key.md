# Registry Key Activity (registry_key)

Registry Key Activity events report when a process performs an action on a Windows registry key.

- **Event UID**: `1`
- **Category**: System Activity
- **Extends**: [System Activity (system)](../../../classes/system.md)
- **Profiles**: [Host](../../../profiles/host.md), [Security Control](../../../profiles/security_control.md), [Cloud](../../../profiles/cloud.md), [Date/Time](../../../profiles/datetime.md)

## Associations

- `device` ↔ `actor.user`
- `actor.user` ↔ `device`

## Inherited attributes

**From System Activity:**
- `device` (required)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `access_mask`

- **Type**: `integer_t`
- **Requirement**: optional
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

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../../../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the `reg_key` object.

### `create_mask`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

The original Windows mask that is required to create the object.

### `open_mask`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: primary

The Windows options needed to open a registry key.

### `reg_key`

- **Type**: `reg_key`
- **Requirement**: required
- **Group**: primary

The registry key.

### `prev_reg_key`

- **Type**: `reg_key`
- **Requirement**: optional
- **Group**: primary

The registry key before the mutation
