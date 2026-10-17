# RDP Activity (rdp_activity)

Remote Desktop Protocol (RDP) Activity events report remote client connections to a server as seen on the network.

- **Class UID**: `4005`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Host](../profiles/host.md), [Network Proxy](../profiles/network_proxy.md), [Security Control](../profiles/security_control.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Network:**
- `dst_endpoint` (required)
- `src_endpoint` (required)
- `connection_info` (recommended)
- `proxy` (recommended)
- `traffic` (recommended)

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

### `activity_id`

- **Type**: `integer_t`
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Initial Request` - The initial RDP request.
- `2`: `Initial Response` - The initial RDP response.
- `3`: `Connect Request` - An RDP connection request.
- `4`: `Connect Response` - An RDP connection response.
- `5`: `TLS Handshake` - The TLS handshake.
- `6`: `Traffic` - Network traffic report.

The normalized identifier of the activity that triggered the event.

### `capabilities`

- **Type**: `string_t`
- **Requirement**: optional

A list of RDP capabilities.

### `certificate_chain`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The list of observed certificates in an RDP TLS connection.

### `device`

- **Type**: [`device`](../objects/device.md)
- **Requirement**: optional

The device instigating the RDP connection.

### `file`

- **Type**: [`file`](../objects/file.md)
- **Requirement**: optional
- **Group**: context

The file that is the target of the RDP activity.

### `identifier_cookie`

- **Type**: `string_t`
- **Requirement**: optional
- **Group**: context

The client identifier cookie during client/server exchange.

### `protocol_ver`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: context

The Remote Desktop Protocol version.

### `remote_display`

- **Type**: [`display`](../objects/display.md)
- **Requirement**: optional

The remote display affiliated with the event

### `request`

- **Type**: [`request`](../objects/request.md)
- **Requirement**: recommended
- **Group**: primary

The client request in an RDP network connection.

### `response`

- **Type**: [`response`](../objects/response.md)
- **Requirement**: recommended
- **Group**: primary

The server response in an RDP network connection.
