# Kernel Extension Activity (kernel_extension_activity)

Kernel Extension events report when a driver/extension is loaded or unloaded into the kernel

- **Class UID**: `1002`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

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

- `1`: `Load` - A driver/extension was loaded into the kernel
- `2`: `Unload` - A driver/extension was unloaded (removed) from the kernel

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required

The actor process that loaded or unloaded the driver/extension.

### `driver`

- **Type**: [`kernel_driver`](../objects/kernel_driver.md)
- **Requirement**: required
- **Group**: primary

The driver that was loaded/unloaded into the kernel
