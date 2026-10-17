# Network Connection Information (network_connection_info)

The Network Connection Information object describes characteristics of a network communication at the OSI Network Layer, such as ICMP and ICMPv6, or the OSI Transport Layer, such as TCP and UDP. Despite its name, the object is not limited to connection-oriented protocols: it also describes connectionless exchanges such as UDP and ICMP.

- **Extends**: [Object (object)](object.md)

## Attributes

### `boundary`

- **Type**: `string_t`
- **Requirement**: optional

The boundary of the connection, normalized to the caption of 'boundary_id'. In the case of 'Other', it is defined by the event source.

For cloud connections, this translates to the traffic-boundary(same VPC, through IGW, etc.). For traditional networks, this is described as Local, Internal, or External.

### `boundary_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `boundary`

#### Enum values

- `0`: `Unknown` - The connection boundary is unknown.
- `1`: `Localhost` - Local network traffic on the same endpoint.
- `2`: `Internal` - Internal network traffic between two endpoints inside network.
- `3`: `External` - External network traffic between two endpoints on the Internet or outside the network.
- `4`: `Same VPC` - Through another resource in the same VPC
- `5`: `Internet/VPC Gateway` - Through an Internet gateway or a gateway VPC endpoint
- `6`: `Virtual Private Gateway` - Through a virtual private gateway
- `7`: `Intra-region VPC` - Through an intra-region VPC peering connection
- `8`: `Inter-region VPC` - Through an inter-region VPC peering connection
- `9`: `Local Gateway` - Through a local gateway
- `10`: `Gateway VPC` - Through a gateway VPC endpoint (Nitro-based instances only)
- `11`: `Internet Gateway` - Through an Internet gateway (Nitro-based instances only)
- `99`: `Other` - The boundary is not mapped. See the `boundary` attribute, which contains a data source specific value.

The normalized identifier of the boundary of the connection.

For cloud connections, this translates to the traffic-boundary (same VPC, through IGW, etc.). For traditional networks, this is described as Local, Internal, or External.

### `community_uid`

- **Type**: `string_t`
- **Requirement**: optional

The Community ID of the network connection.

### `direction`

- **Type**: `string_t`
- **Requirement**: optional

The direction of the initiated connection, traffic, or email, normalized to the caption of the direction_id value. In the case of 'Other', it is defined by the event source.

### `direction_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `direction`

#### Enum values

- `0`: `Unknown` - The connection direction is unknown.
- `1`: `Inbound` - Inbound network connection. The connection originated from the Internet or outside network, destined for services on the inside network.
- `2`: `Outbound` - Outbound network connection. The connection originated from inside the network, destined for services on the Internet or outside network.
- `3`: `Lateral` - Lateral network connection. The connection originated from inside the network, destined for services on the inside network.
- `4`: `Local` - Local network connection (`localhost`). The connection is intra-device, originating from and destined for services running on the same device.
- `99`: `Other` - The direction is not mapped. See the `direction` attribute, which contains a data source specific value.

The normalized identifier of the direction of the initiated connection, traffic, or email.

### `flag_history`

- **Type**: `string_t`
- **Requirement**: optional

The Connection Flag History summarizes events in a network connection. For example flags  `ShAD`  representing SYN, SYN/ACK, ACK and Data exchange.

### `icmp_code`

- **Type**: `integer_t`
- **Requirement**: optional

The control message code, which qualifies `icmp_type`. Applies to both ICMP and ICMPv6 and, like `icmp_type`, is interpreted against the Internet Assigned Numbers Authority (IANA) registry for the protocol in use (IP protocol number `1` for ICMP, `58` for ICMPv6).

### `icmp_type`

- **Type**: `integer_t`
- **Requirement**: optional

The control message type. Applies to both ICMP and ICMPv6, which the Internet Assigned Numbers Authority (IANA) numbers in separate registries, so the same value can identify different messages: interpret it against the registry for the protocol in use (IP protocol number `1` for ICMP, `58` for ICMPv6). For example: `8` for an ICMP Echo Request, or `128` for an ICMPv6 Echo Request.

### `icmp_uid`

- **Type**: `integer_t`
- **Requirement**: optional

The identifier carried in an ICMP query message or an ICMPv6 informational message, such as an Echo Request or a Timestamp message, and repeated in the matching reply, used to correlate the request with its reply.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: recommended

The IP protocol name in lowercase, as defined by the Internet Assigned Numbers Authority (IANA). For example: `tcp` or `udp`.

### `protocol_num`

- **Type**: `integer_t`
- **Requirement**: recommended

The IP protocol number, as defined by the Internet Assigned Numbers Authority (IANA). For example: `6` for TCP and `17` for UDP.

### `protocol_ver`

- **Type**: `string_t`
- **Requirement**: optional

The Internet Protocol version.

### `protocol_ver_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `protocol_ver`

#### Enum values

- `0`: `Unknown`
- `4`: `Internet Protocol version 4 (IPv4)`
- `6`: `Internet Protocol version 6 (IPv6)`
- `99`: `Other`

The Internet Protocol version identifier.

### `session`

- **Type**: [`session`](session.md)
- **Requirement**: optional

The authenticated user or service session.

### `tcp_flags`

- **Type**: `integer_t`
- **Requirement**: optional

The network connection TCP header flags (i.e., control bits).

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the connection.
