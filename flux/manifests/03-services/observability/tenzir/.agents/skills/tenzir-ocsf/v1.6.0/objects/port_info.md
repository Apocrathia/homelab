# Port Information (port_info)

The Port Information object describes a port and its associated protocol details.

- **Extends**: [Object (object)](object.md)

## Attributes

### `port`

- **Type**: `port_t`
- **Requirement**: required

The port number. For example: `80`, `443`, `22`.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: recommended

The IP protocol name in lowercase, as defined by the Internet Assigned Numbers Authority (IANA). For example: `tcp` or `udp`.

### `protocol_num`

- **Type**: `integer_t`
- **Requirement**: optional

The IP protocol number, as defined by the Internet Assigned Numbers Authority (IANA). For example: `6` for TCP and `17` for UDP.
