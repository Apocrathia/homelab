# Module Activity (module_activity)

Module Activity events report when a process loads or unloads the `module`.

- **Class UID**: `1005`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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

- `1`: `Load`
- `2`: `Unload`

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required

The actor that loaded or unloaded the `module`.

### `module`

- **Type**: [`module`](../objects/module.md)
- **Requirement**: required
- **Group**: primary

The module that was loaded or unloaded.
