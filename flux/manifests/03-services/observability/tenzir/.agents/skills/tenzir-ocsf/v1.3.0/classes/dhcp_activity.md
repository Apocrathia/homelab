# DHCP Activity (dhcp_activity)

DHCP Activity events report MAC to IP assignment via DHCP from a client or server.

- **Class UID**: `4004`
- **Category**: Network Activity
- **Extends**: [Network (network)](network.md)
- **Profiles**: [Host](../profiles/host.md), [Network Proxy](../profiles/network_proxy.md), [Security Control](../profiles/security_control.md), [Load Balancer](../profiles/load_balancer.md), [Cloud](../profiles/cloud.md), [Date/Time](../profiles/datetime.md), [OSINT](../profiles/osint.md)

## Inherited attributes

**From Network:**
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
- **Requirement**: required
- **Sibling**: `activity_name`

#### Enum values

- `1`: `Discover` - DHCPDISCOVER
- `2`: `Offer` - DHCPOFFER
- `3`: `Request` - DHCPREQUEST
- `4`: `Decline` - DHCPDECLINE
- `5`: `Ack` - DHCPACK: The server accepts the request by sending the client a DHCP Acknowledgment message.
- `6`: `Nak` - DHCPNAK
- `7`: `Release` - DHCPRELEASE: A DHCP client sends a DHCPRELEASE packet to the server to release the IP address and cancel any remaining lease.
- `8`: `Inform` - DHCPINFORM
- `9`: `Expire` - DHCPEXPIRE: A DHCP lease expired.

The normalized identifier of the activity that triggered the event.

### `dst_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The responder (server) of the DHCP connection.

### `is_renewal`

- **Type**: `boolean_t`
- **Requirement**: recommended
- **Group**: primary

The indication of whether this is a lease/session renewal event.

### `lease_dur`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Group**: primary

This represents the length of the DHCP lease in seconds. This is present in DHCP Ack events.

### `src_endpoint`

- **Type**: [`network_endpoint`](../objects/network_endpoint.md)
- **Requirement**: recommended
- **Group**: primary

The initiator (client) of the DHCP connection.

### `relay`

- **Type**: [`network_interface`](../objects/network_interface.md)
- **Requirement**: recommended
- **Group**: primary

The network relay that is associated with the event.

### `transaction_uid`

- **Type**: `string_t`
- **Requirement**: recommended
- **Group**: primary

The unique identifier of the transaction. This is typically a random number generated from the client to associate a dhcp request/response pair.
