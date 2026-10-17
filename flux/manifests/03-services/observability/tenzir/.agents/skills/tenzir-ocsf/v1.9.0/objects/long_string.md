# Long String (long_string)

This object is a used to capture strings which may be truncated by a security product due to their length.

- **Extends**: [Object (object)](object.md)

## Attributes

### `is_truncated`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates that `value` has been truncated. May be omitted if truncation has not occurred.

### `untruncated_size`

- **Type**: `integer_t`
- **Requirement**: optional

The size in bytes of the string represented by `value` before truncation. Should be omitted if truncation has not occurred.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The string value, truncated if `is_truncated` is `true`.
