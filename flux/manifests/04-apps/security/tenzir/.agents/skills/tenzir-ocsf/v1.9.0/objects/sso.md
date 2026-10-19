# SSO (sso)

The Single Sign-On (SSO) object provides a structure for normalizing SSO attributes, configuration, and/or settings from Identity Providers.

- **Extends**: [Object (object)](object.md)

## Attributes

### `auth_protocol`

- **Type**: `string_t`
- **Requirement**: optional

The authorization protocol as defined by the caption of `auth_protocol_id`. In the case of `Other`, it is defined by the event source.

### `auth_protocol_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `auth_protocol`

#### Enum values

- `0`: `Unknown` - The authentication protocol is unknown.
- `1`: `NTLM`
- `2`: `Kerberos`
- `3`: `Digest`
- `4`: `OpenID`
- `5`: `SAML`
- `6`: `OAUTH 2.0`
- `7`: `PAP`
- `8`: `CHAP`
- `9`: `EAP`
- `10`: `RADIUS`
- `11`: `Basic Authentication`
- `12`: `LDAP`
- `99`: `Other` - The authentication protocol is not mapped. See the `auth_protocol` attribute, which contains a data source specific value.

The normalized identifier of the authentication protocol used by the SSO resource.

### `certificate`

- **Type**: [`certificate`](certificate.md)
- **Requirement**: recommended

Digital Signature associated with the SSO resource, e.g., SAML X.509 certificate details.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

When the SSO resource was created.

### `duration_mins`

- **Type**: `integer_t`
- **Requirement**: optional

The duration (in minutes) for an SSO session, after which re-authentication is required.

### `idle_timeout`

- **Type**: `integer_t`
- **Requirement**: optional

Duration (in minutes) of allowed inactivity before Single Sign-On (SSO) session expiration.

### `login_endpoint`

- **Type**: `url_t`
- **Requirement**: optional

URL for initiating an SSO login request.

### `logout_endpoint`

- **Type**: `url_t`
- **Requirement**: optional

URL for initiating an SSO logout request, allowing sessions to be terminated across applications.

### `metadata_endpoint`

- **Type**: `url_t`
- **Requirement**: optional

URL where metadata about the SSO configuration is available (e.g., for SAML configurations).

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when the SSO resource was updated.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the SSO resource.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: optional

The supported protocol for the SSO resource. E.g., `SAML` or `OIDC`.

### `scopes`

- **Type**: `string_t`
- **Requirement**: optional

Scopes define the specific permissions or actions that the client is allowed to perform on behalf of the user. Each scope represents a different set of permissions, and the user can selectively grant or deny access to specific scopes during the authorization process.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

A unique identifier for a SSO resource.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

Name of the vendor or service provider implementing SSO. E.g., `Okta`, `Auth0`, `Microsoft`.
