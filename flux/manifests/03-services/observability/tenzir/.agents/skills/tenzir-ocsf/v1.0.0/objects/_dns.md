# DNS (_dns)

The Domain Name System (DNS) object represents the shared information associated with the DNS query and answer objects.

- **Extends**: [Object (object)](object.md)

## Attributes

### `class`

- **Type**: `string_t`
- **Requirement**: required

The class of resource records being queried. See [RFC1035](https://www.rfc-editor.org/rfc/rfc1035.txt). For example: `IN`.

### `packet_uid`

- **Type**: `integer_t`
- **Requirement**: recommended

The DNS packet identifier assigned by the program that generated the query. The identifier is copied to the response.

### `type`

- **Type**: `string_t`
- **Requirement**: required

The type of resource records being queried. See [RFC1035](https://www.rfc-editor.org/rfc/rfc1035.txt). For example: A, AAAA, CNAME, MX, and NS.
