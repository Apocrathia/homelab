# Kernel Resource (kernel)

The Kernel Resource object provides information about a specific kernel resource, including its name and type. It describes essential attributes associated with a resource managed by the kernel of an operating system.

- **Extends**: [Object (object)](object.md)

## Attributes

### `is_system`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the object is part of the operating system.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the kernel resource.

### `path`

- **Type**: `file_path_t`
- **Requirement**: optional

The full path of the kernel resource.

### `system_call`

- **Type**: `string_t`
- **Requirement**: optional

The system call that was invoked.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of the kernel resource.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `1`: `Shared Mutex`
- `2`: `System Call`

The type of the kernel resource.
