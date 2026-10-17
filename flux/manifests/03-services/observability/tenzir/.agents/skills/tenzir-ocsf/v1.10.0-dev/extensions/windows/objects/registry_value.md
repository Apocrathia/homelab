# Registry Value (registry_value)

The registry value object describes a Windows registry value.

- **Extends**: [Object (object)](../../../objects/object.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The data of the registry value. Where the value type is known, implementers should instead use a type-specific attribute, i.e. `reg_binary_data`, `reg_integer_data`, `reg_string_data`, or `reg_string_list_data`.

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
- **Observable**: 43

The name of the registry value.

### `path`

- **Type**: `reg_key_path_t`
- **Requirement**: required

The full path to the registry key, where the value is located.

### `reg_binary_data`

- **Type**: `bytestring_t`
- **Requirement**: optional

The data of the registry value when `type_id` is `REG_BINARY` or `REG_NONE`.

### `reg_integer_data`

- **Type**: `long_t`
- **Requirement**: optional

The data of the registry value when `type_id` is `REG_DWORD`, `REG_DWORD_BIG_ENDIAN`, or `REG_QWORD`.

### `reg_string_data`

- **Type**: `string_t`
- **Requirement**: optional

The data of the registry value when `type_id` is `REG_SZ`, `REG_EXPAND_SZ`, or `REG_LINK`.

### `reg_string_list_data`

- **Type**: `string_t`
- **Requirement**: optional

The data of the registry value when `type_id` is `REG_MULTI_SZ`.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

A string representation of the value type as specified in Windows Registry Value Types.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `1`: `REG_BINARY` - Arbitrary binary data.
- `2`: `REG_DWORD` - A 32-bit integer.
- `3`: `REG_DWORD_BIG_ENDIAN` - A 32-bit integer in big-endian byte order.
- `4`: `REG_EXPAND_SZ` - A string containing unexpanded environment variables, e.g. `%USERPROFILE%\Downloads`.
- `5`: `REG_LINK` - A string containing the target path of a symbolic link created by calling `RegCreateKeyEx` with `REG_OPTION_CREATE_LINK`.
- `6`: `REG_MULTI_SZ` - A sequence of zero or more strings.
- `7`: `REG_NONE` - A value with no declared type.
- `8`: `REG_QWORD` - A 64-bit integer.
- `9`: `REG_QWORD_LITTLE_ENDIAN` - Not defined in Windows documentation and previously added to OCSF in error.
  - **Deprecated since v1.6.0.** Use `REG_QWORD` instead.
- `10`: `REG_SZ` - A string.

The value type ID.
