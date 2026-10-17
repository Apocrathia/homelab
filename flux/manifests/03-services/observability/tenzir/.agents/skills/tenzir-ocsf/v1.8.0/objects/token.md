# Token (token)

The Token object is the base object for representing tokens, API keys, and authentication credentials used across different contexts. This object provides common attributes for all token types, including protocol-specific authentication tokens (Kerberos, OIDC, SAML) and API/client tokens used for service authentication. When to use this object: Use the base `token` object directly in API activity events to represent API tokens, client tokens, or API keys used to authenticate API requests. Examples include: Okta API tokens, Microsoft Entra ID Application Registration client secrets, Stripe API keys, AWS API keys. When NOT to use this object: Do NOT use the base `token` object for protocol-specific authentication tokens in authentication events - use `authentication_token` instead (which extends this object). Do NOT use `token` for tracking credential lifecycle and usage patterns - use `programmatic_credential` instead.

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time that the token was created.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The expiration time of the token.

### `is_renewable`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the token is renewable.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The last time the token was updated.

### `name`

- **Type**: `string_t`
- **Requirement**: optional

The human-friendly name of a token or key, if available, such as the `name` from the Okta API Token API.

### `tenant_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the tenant or organization that owns the token or key, or the tenant context in which the token is authorized for use. This is particularly relevant in multi-tenant Identity Provider scenarios where tokens are scoped to specific tenants.

### `type`

- **Type**: `string_t`
- **Requirement**: recommended

The type of the token, normalized to the caption of the `type_id` value. This indicates whether the token is a Client Token, API Token, or one of the protocol-specific token types.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown` - The token type is unknown.
- `1`: `Ticket Granting Ticket` - Ticket Granting Ticket (TGT) for Kerberos.
- `2`: `Service Ticket` - Service Ticket (ST) for Kerberos.
- `3`: `Identity Token` - Identity (ID) Token for OIDC.
- `4`: `Refresh Token` - Refresh Token for OIDC.
- `5`: `SAML Assertion` - Authentication Assertion for SAML.
- `6`: `Client Token` - Client Token issued by an Identity Provider (IdP) for application authentication. Use this value for IdP-issued tokens used for service-to-service authentication. Examples: Microsoft Entra ID Application Registration client secrets, Okta API tokens, Auth0 Machine-to-Machine tokens. Key characteristic: These tokens are issued by Identity Providers, not by individual services.
- `7`: `API Token` - A generic API token or API key used for authenticating API requests. Use this value for service-specific API authentication tokens that are NOT issued by Identity Providers. Examples: REST API keys, GraphQL API keys, Stripe API keys, Twilio API keys, AWS API keys. Key characteristic: These tokens are issued by individual services/platforms, not by Identity Providers.
- `99`: `Other`

The normalized token type identifier. Valid values: 0 (Unknown), 1 (Ticket Granting Ticket - Kerberos), 2 (Service Ticket - Kerberos), 3 (Identity Token - OIDC), 4 (Refresh Token - OIDC), 5 (SAML Assertion), 6 (Client Token - IdP-issued), 7 (API Token - generic API keys), 99 (Other).

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique ID of a token or key, if available, such as the `Secret ID` of Entra ID Application Registration Client Secrets.

### `zone`

- **Type**: `string_t`
- **Requirement**: optional

The network zone or geographic region that the token or key is authorized to be used from. This may represent network-based access restrictions, geographic limitations, or other zone-based authorization policies. Examples include Okta's network zone restrictions or cloud provider region restrictions.
