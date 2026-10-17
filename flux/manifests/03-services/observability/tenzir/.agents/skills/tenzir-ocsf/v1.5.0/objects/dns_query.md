# DNS Query (dns_query)

The DNS query object represents a specific request made to the Domain Name System (DNS) to retrieve information about a domain or perform a DNS operation. This object encapsulates the necessary attributes and methods to construct and send DNS queries, specify the query type (e.g., A, AAAA, MX).

- **Extends**: [DNS (_dns)](_dns.md)

## Attributes

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: required

The hostname or domain being queried. For example: `www.example.com`

### `opcode`

- **Type**: `string_t`
- **Requirement**: optional

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

The DNS opcode ID specifies the normalized query message type as defined in [RFC-5395](https://www.rfc-editor.org/rfc/rfc5395.html).
