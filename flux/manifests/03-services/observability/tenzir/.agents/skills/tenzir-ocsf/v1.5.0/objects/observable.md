# Observable (observable)

The observable object is a pivot element that contains related information found in many places in the event.

- **Extends**: [Object (object)](object.md)

## Attributes

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The full name of the observable attribute. The `name` is a pointer/reference to an attribute within the OCSF event data. For example: `file.name`.

### `reputation`

- **Type**: [`reputation`](reputation.md)
- **Requirement**: optional

Contains the original and normalized reputation scores.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The observable value type name.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - Unknown observable data type.
- `99`: `Other` - The observable data type is not mapped. See the `type` attribute, which may contain data source specific value.

The observable value type identifier.

### `value`

- **Type**: `string_t`
- **Requirement**: optional

The value associated with the observable attribute. The meaning of the value depends on the observable type.
If the `name` refers to a scalar attribute, then the `value` is the value of the attribute.
If the `name` refers to an object attribute, then the `value` is not populated.
