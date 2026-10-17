# Key:Value object (key_value_object)

A generic object allowing to define a `{key:value}` pair.

- **Extends**: [Object (object)](object.md)

## Attributes

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the key.

### `value`

- **Type**: `string_t`
- **Requirement**: recommended

The value associated to the key.

### `values`

- **Type**: `string_t`
- **Requirement**: recommended

Optional, the values associated to the key. You can populate this attribute, when you have multiple values for the same key.
