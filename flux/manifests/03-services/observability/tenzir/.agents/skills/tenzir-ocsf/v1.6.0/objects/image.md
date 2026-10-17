# Image (image)

The Image object provides a description of a specific Virtual Machine (VM) or Container image.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The list of labels associated to the image.

### `name`

- **Type**: `string_t`

The image name. For example: `elixir`.

### `path`

- **Type**: `file_path_t`
- **Requirement**: optional

The full path to the image file.

### `tag`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.4.0.** Use the `labels or tags` attribute instead.

The image tag. For example: `1.11-alpine`.

### `tags`

- **Type**: [`key_value_object`](key_value_object.md)
- **Requirement**: optional

The list of tags; `{key:value}` pairs associated to the image.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique image ID. For example: `77af4d6b9913`.
