# Reporter (reporter)

The entity from which an event or finding was reported.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The hostname of the entity from which the event or finding was reported.

### `ip`

- **Type**: `ip_t`
- **Requirement**: recommended

The IP address of the entity from which the event or finding was reported.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the entity from which the event or finding was reported.

### `org`

- **Type**: [`organization`](organization.md)
- **Requirement**: optional

The organization properties of the entity that reported the event or finding.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the entity from which the event or finding was reported.
