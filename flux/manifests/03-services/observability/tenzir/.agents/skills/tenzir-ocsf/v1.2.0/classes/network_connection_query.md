# Network Connection Query (network_connection_query)

Network Connection Query events report information about active network connections.

- **Class UID**: `5012`
- **Category**: Discovery
- **Extends**: [Discovery Result (discovery_result)](discovery_result.md)
- **Profiles**: [Host](../profiles/host.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md)

## Inherited attributes

**From Discovery Result:**
- `query_result_id` (required)
- `query_info` (recommended)
- `query_result` (recommended)

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

### `connection_info`

- **Type**: [`network_connection_info`](../objects/network_connection_info.md)
- **Requirement**: required
- **Group**: primary

The network connection information.

### `process`

- **Type**: [`process`](../objects/process.md)
- **Requirement**: required
- **Group**: primary

The process that owns the socket.

### `state`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The state of the socket, normalized to the caption of the state_id value. In the case of 'Other', it is defined by the event source.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Group**: primary
- **Sibling**: `state`

#### Enum values

- `0`: `Unknown` - The socket state is unknown.
- `1`: `ESTABLISHED` - The socket has an established connection between a local application and a remote peer.
- `2`: `SYN_SENT` - The socket is actively trying to establish a connection to a remote peer.
- `3`: `SYN_RECV` - The socket has passively received a connection request from a remote peer.
- `4`: `FIN_WAIT1` - The socket connection has been closed by the local application, the remote peer has not yet acknowledged the close, and the system is waiting for it to close its half of the connection.
- `5`: `FIN_WAIT2` - The socket connection has been closed by the local application, the remote peer has acknowledged the close, and the system is waiting for it to close its half of the connection.
- `6`: `TIME_WAIT` - The socket connection has been closed by the local application, the remote peer has closed its half of the connection, and the system is waiting to be sure that the remote peer received the last acknowledgement.
- `7`: `CLOSED` - The socket is not in use.
- `8`: `CLOSE_WAIT` - The socket connection has been closed by the remote peer, and the system is waiting for the local application to close its half of the connection.
- `9`: `LAST_ACK` - The socket connection has been closed by the remote peer, the local application has closed its half of the connection, and the system is waiting for the remote peer to acknowledge the close.
- `10`: `LISTEN` - The socket is listening for incoming connections.
- `11`: `CLOSING` - The socket connection has been closed by the local application and the remote peer simultaneously, and the remote peer has not yet acknowledged the close attempt of the local application.

The state of the socket.
