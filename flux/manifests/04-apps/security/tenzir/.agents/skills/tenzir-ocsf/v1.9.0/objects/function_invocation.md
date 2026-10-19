# Function Invocation (function_invocation)

The Function Invocation object provides details regarding the invocation of a function.

- **Extends**: [Object (object)](object.md)

## Attributes

### `error`

- **Type**: `string_t`
- **Requirement**: optional

The error indication returned from the function. This may differ from the return value (e.g. when `errno` is used).

### `parameters`

- **Type**: [`parameter`](parameter.md)
- **Requirement**: optional

The parameters passed into a function invocation.

### `return_value`

- **Type**: `string_t`
- **Requirement**: optional

The value returned from a function.
