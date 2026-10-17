# Resource (_resource)

The Resource object contains attributes that provide information about a particular resource. It serves as a base object, offering attributes that help identify and classify the resource effectively.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional data describing the resource.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels/tags associated to a resource.

### `name`

- **Type**: `string_t`

The name of the resource.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The resource type as defined by the event source.

### `uid`

- **Type**: `string_t`

The unique identifier of the resource.
