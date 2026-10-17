# Databucket (databucket)

The databucket object is a basic container that holds data, typically organized through the use of data partitions.

- **Extends**: [Resource Details (resource_details)](resource_details.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the databucket was known to have been created.

### `desc`

- **Type**: `string_t`
- **Requirement**: optional

The description of the databucket.

### `encryption_details`

- **Type**: [`encryption_details`](encryption_details.md)
- **Requirement**: optional

The encryption details of the databucket. Should be populated if the databucket is encrypted.

### `file`

- **Type**: [`file`](file.md)
- **Requirement**: optional

Details about the file/object within a databucket.

### `groups`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The group names to which the databucket belongs.

### `is_encrypted`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates if the databucket is encrypted.

### `is_public`

- **Type**: `boolean_t`
- **Requirement**: recommended

Indicates if the databucket is publicly accessible.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when any changes, updates, or modifications were made within the databucket.

### `name`

- **Type**: `string_t`

The databucket name.

### `size`

- **Type**: `long_t`
- **Requirement**: optional

The size of the databucket in bytes.

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

### `uid`

- **Type**: `string_t`

The unique identifier of the databucket.
