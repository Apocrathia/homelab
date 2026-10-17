# Table (table)

The table object represents a table within a structured relational database or datastore, which contains columns and rows of data that are able to be create, updated, deleted and queried.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the table was known to have been created.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when any changes, updates, or modifications were made within the table.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the table.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size of the data table in bytes.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the table belongs.

### `name`

- **Type**: `string_t`

The table name, ordinarily as assigned by a database administrator.

### `uid`

- **Type**: `string_t`

The unique identifier of the table.
