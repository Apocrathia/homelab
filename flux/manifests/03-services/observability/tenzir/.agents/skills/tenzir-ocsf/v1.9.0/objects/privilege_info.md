# Privilege Info (privilege_info)

The Privilege Info object describes information about a specific privilege, action, or permission. It captures the privilege name, type, usage status, and when it was last used.

- **Extends**: [Object (object)](object.md)

## Attributes

### `is_unused`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the privilege is unused within the analysis timeframe.

### `last_used_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time this privilege was used.

### `name`

- **Type**: `string_t`
- **Requirement**: required

The name of the privilege, action, or permission. Examples: `GetObject`, `CreateStoreImageTask` (AWS); `Microsoft.Storage/storageAccounts/read` (Azure); `storage.objects.get` (GCP).

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type or category of the privilege, normalized to the caption of the `type_id` value. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The privilege type is unknown.
- `1`: `Read` - A read-type privilege that permits viewing or retrieving data. Examples: `s3:GetObject`, `Microsoft.Storage/storageAccounts/read`, `storage.objects.get`.
- `2`: `Write` - A write-type privilege that permits creating, modifying, or deleting data. Examples: `s3:PutObject`, `Microsoft.Storage/storageAccounts/write`, `storage.objects.create`.
- `3`: `Execute` - An execute-type privilege that permits running operations or invoking functions. Examples: `lambda:InvokeFunction`, `Microsoft.Compute/virtualMachines/start/action`.
- `99`: `Other` - The privilege type is not mapped. See the `type` attribute, which contains a data source specific value.

The normalized type of the privilege.
