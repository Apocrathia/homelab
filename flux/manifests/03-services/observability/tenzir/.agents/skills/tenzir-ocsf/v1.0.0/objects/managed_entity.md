# Managed Entity (managed_entity)

The Managed Entity object describes the type and version of an entity, such as a policy or configuration.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

The managed entity content as a JSON object.

### `name`

- **Type**: `string_t`

The name of the managed entity.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The managed entity type. For example: `policy`, `user`, `organizational unit`, `device`.

### `uid`

- **Type**: `string_t`

The identifier of the managed entity.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The version of the managed entity. For example: `1.2.3`.
