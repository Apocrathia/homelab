# Kernel Activity (kernel_activity)

Kernel Activity events report when an process creates, reads, or deletes a kernel resource.

- **Class UID**: `1003`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

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

- `1`: `Create`
- `2`: `Read`
- `3`: `Delete`
- `4`: `Invoke`

The normalized identifier of the activity that triggered the event.

### `kernel`

- **Type**: [`kernel`](../objects/kernel.md)
- **Requirement**: required
- **Group**: primary

The target kernel resource.
