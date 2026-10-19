# Edge (edge)

Represents a connection or relationship between two nodes in a graph.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: optional

Additional data about the edge such as weight, distance, or custom properties.

### `is_directed`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the edge is (`true`) or undirected (`false`).

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The human-readable name or label for the edge.

### `relation`

- **Type**: `string_t`
- **Requirement**: recommended

The type of relationship between nodes (e.g. is-attached-to , depends-on, etc).

### `source`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier of the node where the edge originates.

### `target`

- **Type**: `string_t`
- **Requirement**: required

The unique identifier of the node where the edge terminates.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

Unique identifier of the edge.
