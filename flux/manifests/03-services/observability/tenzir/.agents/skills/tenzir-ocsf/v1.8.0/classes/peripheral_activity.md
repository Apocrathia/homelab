# Peripheral Activity (peripheral_activity)

Peripheral Activity events log a system's interactions with external, connectable, and detachable hardware. These events provide visibility into the external devices connected to and used by a system.

- **Class UID**: `1010`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

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

- `1`: `Connect` - A peripheral device was connected to the system.
- `2`: `Disconnect` - A peripheral device was disconnected from the system.
- `3`: `Enable` - A peripheral device was enabled on the system.
- `4`: `Disable` - A peripheral device was disabled on the system.
- `5`: `Eject` - A peripheral device was ejected from the system. This is typically used for removable media devices. Note: For `Mount` and `Unmount` events, see the [File System Activity](file_activity.md) event class.

The normalized identifier of the activity that triggered the event.

### `peripheral_device`

- **Type**: [`peripheral_device`](../objects/peripheral_device.md)
- **Requirement**: required
- **Group**: primary

The peripheral device that is the subject of the activity.
