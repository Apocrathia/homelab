# Resource (_resource)

The Resource object contains attributes that provide information about a particular resource. It serves as a base object, offering attributes that help identify and classify the resource effectively.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the resource was created.

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional data describing the resource.

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels associated to the resource.

### `name`

- **Type**: `string_t`

The name of the resource.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the resource was last modified.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the resource.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The resource type as defined by the event source.

### `uid`

- **Type**: `resource_uid_t`

The unique identifier of the resource.

### `uid_alt`

- **Type**: `resource_uid_t`
- **Requirement**: optional

The alternative unique identifier of the resource.
