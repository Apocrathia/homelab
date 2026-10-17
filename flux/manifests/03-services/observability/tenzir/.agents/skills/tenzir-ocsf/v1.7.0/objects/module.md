# Module (module)

The Module object describes the attributes of a module.

- **Extends**: [Object (object)](object.md)

## Attributes

### `base_address`

- **Type**: `string_t`
- **Requirement**: recommended

The memory address where the module was loaded.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: recommended

The module file object.

### `function_invocation`

- **Type**: [`function_invocation`](function_invocation.md)
- **Requirement**: optional

Details about the invocation of the function given in `function_name`.

### `function_name`

- **Type**: `string_t`
- **Requirement**: recommended

The invoked function in the module. For load and unload events, this is the entry-point function of the module. The system calls the entry-point function whenever a process or thread loads or unloads the module.

### `load_type`

- **Type**: `string_t`
- **Requirement**: optional

The load type, normalized to the caption of the load_type_id value. In the case of 'Other', it is defined by the event source.

### `load_type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `load_type`

#### Enum values

- `1`: `Standard` - A normal module loaded by the normal windows loading mechanism i.e. LoadLibrary.
- `2`: `Non Standard` - A module loaded in a way avoidant of normal windows procedures. i.e. Bootstrapped Loading/Manual Dll Loading.
- `3`: `ShellCode` - A raw module in process memory that is READWRITE_EXECUTE and had a thread started in its range.
- `4`: `Mapped` - A memory mapped file, typically created with CreatefileMapping/MapViewOfFile.
- `5`: `NonStandard Backed` - A module loaded in a non standard way. However, GetModuleFileName succeeds on this allocation.

The normalized identifier for how the module was loaded in memory.

### `start_address`

- **Type**: `string_t`
- **Requirement**: recommended

The start address of the execution.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The module type.
