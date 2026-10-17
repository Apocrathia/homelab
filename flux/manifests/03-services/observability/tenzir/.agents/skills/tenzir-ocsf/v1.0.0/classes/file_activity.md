# File System Activity (file_activity)

File System Activity events report when a process performs an action on a file or folder.

- **Class UID**: `1001`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Associations

- `device` ↔ `actor.user`
- `actor.user` ↔ `device`

## Inherited attributes

**From System Activity:**
- `device` (required)

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `access_mask`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The access mask in a platform-native format.

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `99`: `Other` - The event activity is not mapped.
- `0`: `Unknown` - The event activity is unknown.

The activity ID of the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the `file` object

### `component`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

The name or relative pathname of a sub-component of the data object, if applicable.

For example: `attachment.doc`, `attachment.zip/bad.doc`, or `part.mime/part.cab/part.uue/part.doc`.

### `connection_uid`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The network connection identifier.

### `create_mask`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

The original Windows mask that is required to create the object.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The file that is the target of the activity.

### `file_diff`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: primary

File content differences used for change detection. For example, a common use case is to identify itemized changes within INI or configuration/property setting values.

### `file_result`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: optional
- **Group**: primary

The resulting file object when the activity was allowed and successful.
