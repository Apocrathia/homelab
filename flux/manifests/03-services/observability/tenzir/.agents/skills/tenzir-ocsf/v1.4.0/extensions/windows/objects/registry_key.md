# Registry Key (registry_key)

The registry key object describes a Windows registry key.

- **Extends**: [Object (object)](../../../objects/object.md)

## Attributes

### `is_system`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the object is part of the operating system.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the registry key was last modified.

### `path`

- **Type**: `string_t`
- **Requirement**: required

The full path to the registry key.

### `security_descriptor`

- **Type**: `string_t`
- **Requirement**: optional

The security descriptor of the registry key.
