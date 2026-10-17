# Email Authentication (email_auth)

The Email Authentication object describes the Sender Policy Framework (SPF), DomainKeys Identified Mail (DKIM) and Domain-based Message Authentication, Reporting and Conformance (DMARC) attributes of an email.

- **Extends**: [Object (object)](object.md)

## Attributes

### `dkim_domain`

- **Type**: `string_t`
- **Requirement**: recommended

The DomainKeys Identified Mail (DKIM) signing domain of the email.

### `dkim`

- **Type**: `string_t`
- **Requirement**: recommended

The DomainKeys Identified Mail (DKIM) status of the email.

### `dkim_signature`

- **Type**: `string_t`
- **Requirement**: recommended

The DomainKeys Identified Mail (DKIM) signature used by the sending/receiving system.

### `dmarc`

- **Type**: `string_t`
- **Requirement**: recommended

The Domain-based Message Authentication, Reporting and Conformance (DMARC) status of the email.

### `dmarc_override`

- **Type**: `string_t`
- **Requirement**: recommended

The Domain-based Message Authentication, Reporting and Conformance (DMARC) override action.

### `dmarc_policy`

- **Type**: `string_t`
- **Requirement**: recommended

The Domain-based Message Authentication, Reporting and Conformance (DMARC) policy status.

### `spf`

- **Type**: `string_t`
- **Requirement**: recommended

The Sender Policy Framework (SPF) status of the email.
