# DNS Answer (dns_answer)

The DNS Answer object represents a specific response provided by the Domain Name System (DNS) when querying for information about a domain or performing a DNS operation. It encapsulates the relevant details and data returned by the DNS server in response to a query.

- **Extends**: [DNS (_dns)](_dns.md)

## Attributes

### `class`

- **Type**: `string_t`

The class of DNS data contained in this resource record. See [RFC1035](https://www.rfc-editor.org/rfc/rfc1035.txt). For example: `IN`.

### `flag_ids`

- **Type**: `integer_t`
- **Sibling**: `flags`

#### Enum values

- `0`: `Unknown`
- `1`: `Authoritative Answer`
- `2`: `Truncated Response`
- `3`: `Recursion Desired`
- `4`: `Recursion Available`
- `5`: `Authentic Data`
- `6`: `Checking Disabled`
- `99`: `Other` - The event DNS header flag is not mapped.

The list of DNS answer header flag IDs.

### `flags`

- **Type**: `string_t`

The list of DNS answer header flags.

### `rdata`

- **Type**: `string_t`
- **Requirement**: required

The data describing the DNS resource. The meaning of this data depends on the type and class of the resource record.

### `ttl`

- **Type**: `integer_t`
- **Requirement**: recommended

The time interval that the resource record may be cached. Zero value means that the resource record can only be used for the transaction in progress, and should not be cached.

### `type`

- **Type**: `string_t`

The type of data contained in this resource record. See [RFC1035](https://www.rfc-editor.org/rfc/rfc1035.txt). For example: `CNAME`.
