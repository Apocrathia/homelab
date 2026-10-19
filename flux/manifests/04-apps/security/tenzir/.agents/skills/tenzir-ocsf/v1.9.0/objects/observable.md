# Observable (observable)

The observable object is a pivot element that contains related information found in many places in the event.

- **Extends**: [Object (object)](object.md)

## Attributes

### `event_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier (`metadata.uid`) of the source OCSF event from which this observable was extracted. This field enables linking observables back to their originating event data when observables are stored in a separate location or system.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The full name of the observable attribute. The `name` is a pointer/reference to an attribute within the OCSF event data. For example: `file.name`. Array attributes may be represented in one of three ways. For example: `resources.uid`, `resources[].uid`, `resources[0].uid`.

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

### `type_uid`

- **Type**: `long_t`
- **Requirement**: optional
- **Sibling**: `type_name`

The OCSF event type UID (`type_uid`) of the source event that this observable was extracted from. This field enables filtering and categorizing observables by their originating event type. For example: `300101` for Network Activity (class_uid 3001) with activity_id 1.

### `value`

- **Type**: `string_t`
- **Requirement**: optional

The value associated with the observable attribute. The meaning of the value depends on the observable type.
If the `name` refers to a scalar attribute, then the `value` is the value of the attribute.
If the `name` refers to an object attribute, then the `value` is not populated.
