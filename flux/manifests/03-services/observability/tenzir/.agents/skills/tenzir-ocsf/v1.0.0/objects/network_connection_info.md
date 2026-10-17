# Network Connection Information (network_connection_info)

The Network Connection Information object describes characteristics of a network connection. Defined by D3FEND [d3f:NetworkSession](https://d3fend.mitre.org/dao/artifact/d3f:NetworkSession/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `boundary`

- **Type**: `string_t`

The boundary of the connection, normalized to the caption of 'boundary_id'. In the case of 'Other', it is defined by the event source.

For cloud connections, this translates to the traffic-boundary(same VPC, through IGW, etc.). For traditional networks, this is described as Local, Internal, or External.

### `boundary_id`

- **Type**: `integer_t`
- **Sibling**: `boundary`

#### Enum values

- `99`: `Other`
- `0`: `Unknown` - The connection boundary is unknown.
- `1`: `Localhost` - Local network traffic on the same endpoint.
- `10`: `Gateway VPC` - Through a gateway VPC endpoint (Nitro-based instances only)
- `11`: `Internet Gateway` - Through an Internet gateway (Nitro-based instances only)
- `2`: `Internal` - Internal network traffic between two endpoints inside network.
- `3`: `External` - External network traffic between two endpoints on the Internet or outside the network.
- `4`: `Same VPC` - Through another resource in the same VPC
- `5`: `Internet/VPC Gateway` - Through an Internet gateway or a gateway VPC endpoint
- `6`: `Virtual Private Gateway` - Through a virtual private gateway
- `7`: `Intra-region VPC` - Through an intra-region VPC peering connection
- `8`: `Inter-region VPC` - Through an inter-region VPC peering connection
- `9`: `Local Gateway` - Through a local gateway

The normalized identifier of the boundary of the connection.

For cloud connections, this translates to the traffic-boundary (same VPC, through IGW, etc.). For traditional networks, this is described as Local, Internal, or External.

### `direction`

- **Type**: `string_t`
- **Requirement**: optional

The direction of the initiated connection, traffic, or email, normalized to the caption of the direction_id value. In the case of 'Other', it is defined by the event source.

### `direction_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `direction`

#### Enum values

- `0`: `Unknown` - Connection direction is unknown.
- `1`: `Inbound` - Inbound network connection. The connection was originated from the Internet or outside network, destined for services on the inside network.
- `2`: `Outbound` - Outbound network connection. The connection was originated from inside the network, destined for services on the Internet or outside network.
- `3`: `Lateral` - Lateral network connection. The connection was originated from inside the network, destined for services on the inside network.
- `99`: `Other`

The normalized identifier of the direction of the initiated connection, traffic, or email.

### `protocol_name`

- **Type**: `string_t`

The TCP/IP protocol name in lowercase, as defined by the Internet Assigned Numbers Authority (IANA). See [Protocol Numbers](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml). For example: `tcp` or `udp`.

### `protocol_num`

- **Type**: `integer_t`
- **Requirement**: recommended

The TCP/IP protocol number, as defined by the Internet Assigned Numbers Authority (IANA). Use -1 if the protocol is not defined by IANA. See [Protocol Numbers](https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml). For example: `6` for TCP and `17` for UDP.

### `protocol_ver`

- **Type**: `string_t`

The Internet Protocol version.

### `protocol_ver_id`

- **Type**: `integer_t`
- **Sibling**: `protocol_ver`

#### Enum values

- `0`: `Unknown`
- `4`: `Internet Protocol version 4 (IPv4)`
- `6`: `Internet Protocol version 6 (IPv6)`
- `99`: `Other`

The Internet Protocol version identifier.

### `tcp_flags`

- **Type**: `integer_t`

The network connection TCP header flags (i.e., control bits).

### `uid`

- **Type**: `string_t`

The unique identifier of the connection.
