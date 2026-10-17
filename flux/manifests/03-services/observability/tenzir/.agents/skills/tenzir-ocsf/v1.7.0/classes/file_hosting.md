# File Hosting Activity (file_hosting)

File Hosting Activity events report the actions taken by file management applications, including file sharing servers like Sharepoint and services such as Box, MS OneDrive, Google Drive, or network file share services.

- **Class UID**: `6006`
- **Category**: Application Activity
- **Extends**: [Application Activity (application)](application.md)
- **Profiles**: [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Inherited attributes

**From Base Event:**
- `category_uid` (required)
- `class_uid` (required)
- `metadata` (required)
- `severity_id` (required)
- `time` (required)
- `type_uid` (required)
- `message` (recommended)
- `observables` (recommended)
- `status` (recommended)
- `status_code` (recommended)
- `status_detail` (recommended)
- `status_id` (recommended)
- `timezone_offset` (recommended)

## Attributes

### `access_list`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The list of requested access rights.

### `access_mask`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context

The sum of hexadecimal values of requested access rights.

### `access_result`

- **Type**: `json_t`
- **Requirement**: optional
- **Group**: context

The list of access check results.

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Upload` - Upload a file.
- `2`: `Download` - Download a file.
- `3`: `Update` - Update a file.
- `4`: `Delete` - Delete a file.
- `5`: `Rename` - Rename a file.
- `6`: `Copy` - Copy a file.
- `7`: `Move` - Move a file.
- `8`: `Restore` - Restore a file.
- `9`: `Preview` - Preview a file.
- `10`: `Lock` - Lock a file.
- `11`: `Unlock` - Unlock a file.
- `12`: `Share` - Share a file.
- `13`: `Unshare` - Unshare a file.
- `14`: `Open` - Open a file.
- `15`: `Sync` - Mark a file or folder to sync with a computer.
- `16`: `Unsync` - Mark a file or folder to not sync with a computer.
- `17`: `Access Check` - Access check for a file. The `security_control` profile can be used to add the access check results.

The normalized identifier of the activity that triggered the event.

### `actor`

- **Type**: [`actor`](../objects/actor.md)
- **Requirement**: required
- **Group**: primary

The actor that performed the activity on the target file.

### `connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: optional
- **Group**: context

The network connection information.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended

The endpoint that received the activity on the target file.

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

### `file_result`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: optional
- **Group**: context

The resulting file object when the activity was allowed and successful.

### `http_request`

- **Type**: [`http_request`](../objects/http_request.md)
- **Requirement**: recommended
- **Group**: context

Details about the underlying HTTP request.

### `http_response`

- **Type**: [`http_response`](../objects/http_response.md)
- **Requirement**: optional
- **Group**: context

Details about the HTTP response, if available.

### `share`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The share name.

### `share_type`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The share type, normalized to the caption of the share_type_id value. In the case of 'Other', it is defined by the event source.

### `share_type_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Group**: context
- **Sibling**: `share_type`

#### Enum values

- `0`: `Unknown` - The share type is unknown.
- `1`: `File`
- `2`: `Pipe`
- `3`: `Print`
- `99`: `Other` - The share type is not mapped. See the `share_type` attribute, which contains a data source specific value.

The normalized identifier of the share type.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: required
- **Group**: primary

The endpoint that performed the activity on the target file.
