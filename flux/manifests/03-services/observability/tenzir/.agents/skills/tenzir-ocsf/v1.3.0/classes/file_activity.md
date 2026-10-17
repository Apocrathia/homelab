# File System Activity (file_activity)

File System Activity events report when a process performs an action on a file or folder.

- **Class UID**: `1001`
- **Category**: System Activity
- **Extends**: [System Activity (system)](system.md)
- **Profiles**: [Host](../profiles/host.md), [Security Control](../profiles/security_control.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

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
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
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

- `1`: `Create` - A request to create a new file on a file system.
- `2`: `Read` - A request to read data from a file on a file system.
- `3`: `Update` - A request to write data to a file on a file system.
- `4`: `Delete` - A request to delete a file on a file system.
- `5`: `Rename` - A request to rename a file on a file system.
- `6`: `Set Attributes` - A request to set attributes for a file on a file system.
- `7`: `Set Security` - A request to set security for a file on a file system.
- `8`: `Get Attributes` - A request to get attributes for a file on a file system.
- `9`: `Get Security` - A request to get security for a file on a file system.
- `10`: `Encrypt` - A request to encrypt a file on a file system.
- `11`: `Decrypt` - A request to decrypt a file on a file system.
- `12`: `Mount` - A request to mount a file on a file system.
- `13`: `Unmount` - A request to unmount a file from a file system.
- `14`: `Open` - A request to create a file handle.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required

The actor that performed the activity on the `file` object

### `component`

- **Type**: `string_t`
- **Requirement**: recommended
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
- **Requirement**: recommended
- **Group**: primary

The original Windows mask that is required to create the object.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The file that is the target of the activity.

### `file_diff`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

File content differences used for change detection. For example, a common use case is to identify itemized changes within INI or configuration/property setting values.

### `file_result`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: recommended
- **Group**: primary

The resulting file object when the activity was allowed and successful.
