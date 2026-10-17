# Schema Extension (extension)

The OCSF Schema Extension object provides detailed information about the schema extension used to construct the event. The schema extensions are registered in the [extensions.md](https://github.com/ocsf/ocsf-schema/blob/main/extensions.md) file.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `name`

- **Type**: `string_t`

The schema extension name. For example: `dev`.

### `uid`

- **Type**: `string_t`

The schema extension unique identifier. For example: `999`.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The schema extension version. For example: `1.0.0-alpha.2`.
