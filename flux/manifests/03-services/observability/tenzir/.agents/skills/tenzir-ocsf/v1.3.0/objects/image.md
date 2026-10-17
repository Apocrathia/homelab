# Image (image)

The Image object provides a description of a specific Virtual Machine (VM) or Container image. Defined by D3FEND [d3f:ContainerImage](https://d3fend.mitre.org/dao/artifact/d3f:ContainerImage/).

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `labels`

- **Type**: `string_t`
- **Requirement**: optional

The image labels.

### `name`

- **Type**: `string_t`

The image name. For example: `elixir`.

### `path`

- **Type**: `string_t`
- **Requirement**: optional

The full path to the image file.

### `tag`

- **Type**: `string_t`
- **Requirement**: optional

The image tag. For example: `1.11-alpine`.

### `uid`

- **Type**: `string_t`
- **Requirement**: required

The unique image ID. For example: `77af4d6b9913`.
