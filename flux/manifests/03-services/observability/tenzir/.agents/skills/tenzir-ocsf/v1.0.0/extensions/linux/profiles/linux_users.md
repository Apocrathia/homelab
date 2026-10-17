# Linux (linux_users)

The attributes that Linux uses to identify user information.

## Applies to

- Linux Process

## Attributes

### `auid`

- **Type**: `integer_t`
- **Requirement**: optional

The audit user assigned at login by the audit subsystem.

### `egid`

- **Type**: `integer_t`
- **Requirement**: optional

The effective group under which this process is running.

### `euid`

- **Type**: `integer_t`
- **Requirement**: optional

The effective user under which this process is running.

### `group`

- **Type**: [`group`](../../../objects/group.md)
- **Requirement**: recommended

The group under which this process is running.
