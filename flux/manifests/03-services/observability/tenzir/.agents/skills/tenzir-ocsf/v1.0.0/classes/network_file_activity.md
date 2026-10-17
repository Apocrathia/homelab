# Network File Activity (network_file_activity)

Network File Activity events report activities on a cloud file storage service such as Box, MS OneDrive, or Google Drive.

- **Class UID**: `4010`
- **Category**: Network Activity
- **Extends**: [Base Event (base_event)](base_event.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Base Event:**
- `metadata` (required)
- `severity_id` (required)
- `message` (recommended)
- `status_id` (recommended)

## Attributes

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Upload`
- `2`: `Download`
- `3`: `Update`
- `4`: `Delete`
- `5`: `Rename`
- `6`: `Copy`
- `7`: `Move`
- `8`: `Restore`
- `9`: `Preview`
- `10`: `Lock`
- `11`: `Unlock`
- `12`: `Share`
- `13`: `Unshare`
- `14`: `Open`

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required
- **Group**: primary

The actor that performed the activity on the target file.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: optional
- **Group**: context

The share expiration time.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: required
- **Group**: primary

The file that is the target of the activity.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: required
- **Group**: primary

The endpoint that performed the activity on the target file.
