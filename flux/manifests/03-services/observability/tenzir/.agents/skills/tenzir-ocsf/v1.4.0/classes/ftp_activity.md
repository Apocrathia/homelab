# FTP Activity (ftp_activity)

File Transfer Protocol (FTP) Activity events report file transfers between a server and a client as seen on the network.

- **Class UID**: `4008`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Network Proxy](../profiles/network_proxy.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [Host](../profiles/host.md), [OSINT](../profiles/osint.md), [Security Control](../profiles/security_control.md)

## Constraints

- **At least one of**: `dst_endpoint`, `src_endpoint`

## Inherited attributes

**From Network:**
- `connection_info` (recommended)
- `dst_endpoint` (recommended)
- `proxy` (recommended)
- `src_endpoint` (recommended)
- `traffic` (recommended)

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

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Put` - File upload to the FTP or SFTP site.
- `2`: `Get` - File download from the FTP or SFTP site.
- `3`: `Poll` - Poll directory for specific file(s) or folder(s) at the FTP or SFTP site location.
- `4`: `Delete` - Delete file(s) from the FTP or SFTP site.
- `5`: `Rename` - Rename the file(s) in the FTP or SFTP site.
- `6`: `List` - List files in a specified directory.

The normalized identifier of the activity that triggered the event.

### `codes`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

The list of return codes to the FTP command.

### `command`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The FTP command.

### `command_responses`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The list of responses to the FTP command.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: optional
- **Group**: context

The file that is the target of the FTP activity.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The name of the data affiliated with the command.

### `port`

- **Type**: `port_t`
- **Requirement**: recommended
- **Group**: primary

The dynamic port established for impending data transfers.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The type of FTP network connection (e.g. active, passive).
