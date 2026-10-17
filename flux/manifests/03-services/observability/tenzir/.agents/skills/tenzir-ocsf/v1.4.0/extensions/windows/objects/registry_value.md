# Registry Value (registry_value)

The registry value object describes a Windows registry value.

- **Extends**: [Object (object)](../../../objects/object.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The data of the registry value.

### `is_default`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the value is from a default value name. For example, the value name could be missing.

### `is_system`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the object is part of the operating system.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the registry value was last modified.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the registry value.

### `path`

- **Type**: `string_t`
- **Requirement**: required

The full path to the registry key, where the value is located.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

A string representation of the value type as specified in [Registry Value Types](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-value-types).

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `REG_BINARY`
- `2`: `REG_DWORD`
- `3`: `REG_DWORD_BIG_ENDIAN`
- `4`: `REG_EXPAND_SZ`
- `5`: `REG_LINK`
- `6`: `REG_MULTI_SZ`
- `7`: `REG_NONE`
- `8`: `REG_QWORD`
- `9`: `REG_QWORD_LITTLE_ENDIAN`
- `10`: `REG_SZ`

The value type ID.
