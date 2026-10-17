# Database (database)

The database object is used for databases which are typically datastore services that contain an organized collection of structured and unstructured data or a types of data.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the database was known to have been created.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the database.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the database belongs.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when any changes, updates, or modifications were made within the database.

### `name`

- **Type**: `string_t`

The database name, ordinarily as assigned by a database administrator.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size of the database in bytes.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The database type.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `Relational`
- `2`: `Network`
- `3`: `Object Oriented`
- `4`: `Centralized`
- `5`: `Operational`
- `6`: `NoSQL`
- `99`: `Other`

The normalized identifier of the database type.

### `uid`

- **Type**: `string_t`

The unique identifier of the database.
