# Service (service)

The Service object describes characteristics of a service,  `e.g. AWS EC2.`

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels associated with the service.

### `name`

- **Type**: `string_t`

The name of the service.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the service.

### `uid`

- **Type**: `string_t`

The unique identifier of the service.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The version of the service.
