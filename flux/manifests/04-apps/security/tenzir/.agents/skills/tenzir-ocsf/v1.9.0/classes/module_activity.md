# Module Activity (module_activity)

Module Activity events report when an endpoint process acts on a `module`.

- **Class UID**: `1005`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [AI Operation](../profiles/ai_operation.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Record Integrity](../profiles/record_integrity.md), [Security Control](../profiles/security_control.md)

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

- `1`: `Load` - The target module was loaded.
- `2`: `Unload` - The target module was unloaded.
- `3`: `Invoke` - A function exported from the target module was invoked.

The normalized identifier of the activity that triggered the event. Each event class defines its own set of activity values. Use `0` (Unknown) when the activity cannot be determined. Use `99` (Other) when the activity does not match any defined value, in which case `activity_name` must be populated with the source-specific label.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the target `module`. For example, the process that loaded a module into memory.

### `module`

- **Type**: [`module`](../objects/module.md)
- **Requirement**: required
- **Group**: primary

The module that was loaded, unloaded, or invoked.
