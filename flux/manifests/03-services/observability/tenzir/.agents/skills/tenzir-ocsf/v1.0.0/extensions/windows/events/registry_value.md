# Registry Value Activity (registry_value)

Registry Value Activity events reports when a process performs an action on a Windows registry value.

- **Event UID**: `2`
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

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `99`: `Other` - The event activity is not mapped.
- `0`: `Unknown` - The event activity is unknown.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../../../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the `reg_value` object.

### `reg_value`

- **Type**: [`registry_value`](../objects/registry_value.md)
- **Requirement**: required

The registry value.

### `prev_reg_value`

- **Type**: [`registry_value`](../objects/registry_value.md)
- **Requirement**: optional

The registry value before the mutation
