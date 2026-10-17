# DNS Query (dns_query)

The DNS Query object represents a specific request made to the Domain Name System (DNS) to retrieve information about a domain or perform a DNS operation.

- **Extends**: [Object (object)](object.md)

## Attributes

### `class`

- **Type**: `string_t`
- **Requirement**: recommended

The class of resource records being queried. See RFC 1035. For example: `IN`.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: required

The hostname or domain being queried. For example: `www.example.com`

### `opcode`

- **Type**: `string_t`
- **Requirement**: optional

> **Deprecated since v1.9.0.** Use `dns_activity.opcode` instead.

The DNS opcode specifies the type of the query message.

### `opcode_id`

- **Type**: `integer_t`
- **Requirement**: recommended

#### Enum values

- `0`: `Query` - Standard query
- `1`: `Inverse Query` - Inverse query, obsolete
- `2`: `Status` - Server status request
- `3`: `Reserved` - Reserved, not used
- `4`: `Notify` - Zone change notification
- `5`: `Update` - Dynamic DNS update
- `6`: `DSO Message` - DNS Stateful Operations (DSO)
- `99`: `Other` - The DNS Opcode is not defined by the RFC. See the `opcode` attribute, which contains a data source specific value.

> **Deprecated since v1.9.0.** Use `dns_activity.opcode_id` instead.

The DNS opcode ID specifies the normalized query message type as defined in RFC 5395.

### `packet_uid`

- **Type**: `integer_t`
- **Requirement**: recommended

> **Deprecated since v1.9.0.** Use `dns_activity.transaction_id` instead.

The DNS packet identifier assigned by the program that generated the query. The identifier is copied to the response.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The type of resource records being queried. See RFC 1035. For example: A, AAAA, CNAME, MX, and NS.
