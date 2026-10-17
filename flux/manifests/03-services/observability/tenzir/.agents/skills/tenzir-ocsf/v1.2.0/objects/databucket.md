# Databucket (databucket)

The databucket object is a basic container that holds data, typically organized through the use of data partitions.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the databucket was known to have been created.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when any changes, updates, or modifications were made within the databucket.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the databucket.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size of the databucket in bytes.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: optional

A file within a databucket.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the databucket belongs.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The databucket type.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `S3`
- `2`: `Azure Blob`
- `3`: `GCP Bucket`
- `99`: `Other`

The normalized identifier of the databucket type.

### `name`

- **Type**: `string_t`

The databucket name.

### `uid`

- **Type**: `string_t`

The unique identifier of the databucket.
