# Service Privilege Analysis (service_privilege_analysis)

The Service Privilege Analysis object describes privilege analysis results for a single cloud service or resource namespace. It provides metrics on privilege usage, counts by type, and mappings to potential attack techniques.

- **Extends**: [Object (object)](object.md)

## Attributes

### `all_privileges_unused`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether all privileges within this service are unused.

### `analyzed_privileges_count`

- **Type**: `integer_t`
- **Requirement**: optional

The total count of privileges analyzed within this service.

### `execute_count`

- **Type**: `integer_t`
- **Requirement**: optional

The count of execute-type privileges within this service.

### `last_used_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time any privilege in this service was used.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The service or namespace identifier. Examples: `s3`, `ec2` (AWS); `Microsoft.Storage` (Azure); `storage` (GCP).

### `privilege_attack_info_list`

- **Type**: [`privilege_attack_info`](privilege_attack_info.md)
- **Requirement**: optional

The list of privilege-to-attack mappings for this service.

### `read_count`

- **Type**: `integer_t`
- **Requirement**: optional

The count of read-type privileges within this service.

### `unused_privileges_count`

- **Type**: `integer_t`
- **Requirement**: optional

The count of unused privileges within this service.

### `write_count`

- **Type**: `integer_t`
- **Requirement**: optional

The count of write-type privileges within this service.
