# Authentication Token (authentication_token)

The Authentication Token object extends the base `token` object and represents standardized authentication tokens, tickets, or assertions that conform to established authentication protocols such as Kerberos, OIDC, and SAML. This object inherits all attributes from `token` and adds protocol-specific attributes (e.g., `kerberos_flags`, `encryption_details`) for authentication events. Use this object in authentication events to represent protocol-specific tokens: Kerberos Ticket Granting Tickets (TGT) and Service Tickets (ST), OIDC Identity Tokens and Refresh Tokens, and SAML Assertions. These tokens are issued by authentication servers and identity providers and carry protocol-specific metadata, lifecycle information, and security attributes defined by their respective specifications. When to use this object: Use `authentication_token` when representing protocol-specific authentication tokens (type_id values 1-5: Kerberos TGT/ST, OIDC ID/Refresh tokens, SAML assertions) in authentication events. When NOT to use this object: Do NOT use `authentication_token` for API tokens or client tokens (type_id values 6-7) used in API activity events - use the base `token` object instead. Do NOT use `authentication_token` for generic API keys - use the base `token` object instead.

- **Extends**: [Token (token)](token.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time that the authentication token was created or issued. This corresponds to the token issuance time, such as the `iat` (issued at) claim in OIDC tokens, the issue instant in SAML assertions, or the ticket start time in Kerberos tickets.

### `encryption_details`

- **Type**: [`encryption_details`](encryption_details.md)
- **Requirement**: recommended

The encryption details of the authentication token.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The expiration time of the authentication token.

### `is_renewable`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the authentication token is renewable.

### `kerberos_flags`

- **Type**: `string_t`
- **Requirement**: recommended

A bitmask, either in hexadecimal or decimal form, which encodes various attributes or permissions associated with a Kerberos ticket. These flags delineate specific characteristics of the ticket, such as its renewability or forwardability.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The type of the authentication token.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The Authentication token type is unknown.
- `1`: `Ticket Granting Ticket` - Ticket Granting Ticket (TGT) for Kerberos.
- `2`: `Service Ticket` - Service Ticket (ST) for Kerberos.
- `3`: `Identity Token` - Identity (ID) Token for OIDC.
- `4`: `Refresh Token` - Refresh Token for OIDC.
- `5`: `SAML Assertion` - Authentication Assertion for SAML.
- `99`: `Other`

The normalized authentication token type identifier. This attribute restricts the base `token.type_id` enum to only protocol-specific authentication token types (values 0, 1-5, 99). API tokens and client tokens (values 6-7) are not valid for `authentication_token` - use the base `token` object for those types.
