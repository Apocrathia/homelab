# DNS Resource Record (dns_resource_record)

The DNS Resource Record object represents a single resource record as defined in RFC 1035. It is used in the Answer, Authority, and Additional sections of a DNS message.

- **Extends**: [Object (object)](object.md)

## Attributes

### `class`

- **Type**: `string_t`
- **Requirement**: recommended

The class of DNS data contained in this resource record. See RFC 1035. For example: `IN`.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The owner name of the resource record. For example: `www.example.com`.

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
- **Requirement**: recommended

The type of data contained in this resource record. See RFC 1035. For example: `CNAME`.
