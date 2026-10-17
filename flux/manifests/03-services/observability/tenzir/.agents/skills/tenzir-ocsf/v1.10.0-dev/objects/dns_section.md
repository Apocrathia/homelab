# DNS Section (dns_section)

The DNS Section object represents a DNS message section that carries supplementary resource records alongside an optional TSIG record. It is used for both the client Additional section (`query_additional`) and the server Additional section (`response_additional`) of a DNS message. A DNS message has at most one TSIG record, which authenticates the entire message.

- **Extends**: [Object (object)](object.md)

## Attributes

### `records`

- **Type**: [`dns_resource_record`](dns_resource_record.md)
- **Requirement**: required

The resource records contained in this DNS section.

### `tsig`

- **Type**: [`tsig`](tsig.md)
- **Requirement**: optional

The TSIG (Transaction Signature) record present in this DNS section, used to authenticate the entire DNS message. Per RFC 2845, at most one TSIG record is permitted per DNS message.
