# Authentication Token (authentication_token)

The Authentication Token object contains the attributes pertaining to an authentication token, ticket, or assertion e.g. Kerberos, OIDC, SAML.

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time that the authentication token was created.

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

The normalized authentication token type identifier.
