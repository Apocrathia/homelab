# Network Interface (network_interface)

The Network Interface object describes the type and associated attributes of a network interface.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The hostname associated with the network interface.

### `ip`

- **Type**: `ip_t`
- **Requirement**: recommended

The IP address associated with the network interface.

### `mac`

- **Type**: `mac_t`
- **Requirement**: recommended

The MAC address of the network interface.

### `name`

- **Type**: `string_t`

The name of the network interface.

### `namespace`

- **Type**: `string_t`
- **Requirement**: optional

The namespace is useful in merger or acquisition situations. For example, when similar entities exists that you need to keep separate.

### `subnet_prefix`

- **Type**: `integer_t`
- **Requirement**: optional

The subnet prefix length determines the number of bits used to represent the network part of the IP address. The remaining bits are reserved for identifying individual hosts within that subnet.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The type of network interface.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `Wired`
- `2`: `Wireless`
- `3`: `Mobile`
- `4`: `Tunnel`
- `99`: `Other`

The network interface type identifier.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier for the network interface.
