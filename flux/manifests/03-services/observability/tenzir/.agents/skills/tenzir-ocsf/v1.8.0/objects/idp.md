# Identity Provider (idp)

The Identity Provider object contains detailed information about a provider responsible for creating, maintaining, and managing identity information while offering authentication services to applications. An Identity Provider (IdP) serves as a trusted authority that verifies the identity of users and issues authentication tokens or assertions to enable secure access to applications or services.

- **Extends**: [Entity (_entity)](_entity.md)

## Attributes

### `auth_factors`

- **Type**: [`auth_factor`](auth_factor.md)
- **Requirement**: optional

The Authentication Factors object describes the different types of Multi-Factor Authentication (MFA) methods and/or devices supported by the Identity Provider.

### `domain`

- **Type**: `string_t`
- **Requirement**: optional

The primary domain associated with the Identity Provider.

### `fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

The fingerprint of the X.509 certificate used by the Identity Provider.

### `has_mfa`

- **Type**: `boolean_t`
- **Requirement**: optional

The Identity Provider enforces Multi Factor Authentication (MFA).

### `issuer`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier (often a URL) used by the Identity Provider as its issuer.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the Identity Provider.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: optional

The supported protocol of the Identity Provider. E.g., `SAML`, `OIDC`, or `OAuth2`.

### `scim`

- **Type**: [`scim`](scim.md)
- **Requirement**: optional

The System for Cross-domain Identity Management (SCIM) resource object provides a structured set of attributes related to SCIM protocols used for identity provisioning and management across cloud-based platforms. It standardizes user and group provisioning details, enabling identity synchronization and lifecycle management with compatible Identity Providers (IdPs) and applications. SCIM is defined in [RFC-7634](https://datatracker.ietf.org/doc/html/rfc7643)

### `sso`

- **Type**: [`sso`](sso.md)
- **Requirement**: optional

The Single Sign-On (SSO) object provides a structure for normalizing SSO attributes, configuration, and/or settings from Identity Providers.

### `state`

- **Type**: `string_t`
- **Requirement**: optional

The configuration state of the Identity Provider, normalized to the caption of the `state_id` value. In the case of `Other`, it is defined by the event source.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `state`

#### Enum values

- `0`: `Unknown` - The configuration state of the Identity Provider is unknown.
- `1`: `Active` - The Identity Provider is in an Active state, or otherwise enabled.
- `2`: `Suspended` - The Identity Provider is in a Suspended state.
- `3`: `Deprecated` - The Identity Provider is in a Deprecated state, or is otherwise disabled.
- `4`: `Deleted` - The Identity Provider is in a Deleted state.
- `99`: `Other` - The configuration state of the Identity Provider is not mapped. See the `state` attribute, which contains a data source specific value.

The normalized state ID of the Identity Provider to reflect its configuration or activation status.

### `tenant_uid`

- **Type**: `string_t`
- **Requirement**: optional

The tenant ID associated with the Identity Provider.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the Identity Provider.

### `url_string`

- **Type**: `url_t`
- **Requirement**: optional

The URL for accessing the configuration or metadata of the Identity Provider.
