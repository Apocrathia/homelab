# SCIM (scim)

The System for Cross-domain Identity Management (SCIM) Configuration object provides a structured set of attributes related to SCIM protocols used for identity provisioning and management across cloud-based platforms. It standardizes user and group provisioning details, enabling identity synchronization and lifecycle management with compatible Identity Providers (IdPs) and applications. SCIM is defined in [RFC-7634](https://datatracker.ietf.org/doc/html/rfc7643)

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

The normalized identifier of the authorization protocol used by the SCIM resource.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

When the SCIM resource was added to the service provider.

### `error_message`

- **Type**: `string_t`
- **Requirement**: optional

Message or code associated with the last encountered error.

### `is_group_provisioning_enabled`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the SCIM resource is configured to provision groups, automatically or otherwise.

### `is_user_provisioning_enabled`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether the SCIM resource is configured to provision users, automatically or otherwise.

### `last_run_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

Timestamp of the most recent successful synchronization.

### `modified_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The most recent time when the SCIM resource was updated at the service provider.

### `name`

- **Type**: `string_t`
- **Requirement**: recommended

The name of the SCIM resource.

### `protocol_name`

- **Type**: `string_t`
- **Requirement**: optional

The supported protocol for the SCIM resource. E.g., `SAML`, `OIDC`, or `OAuth2`.

### `rate_limit`

- **Type**: `integer_t`
- **Requirement**: optional

Maximum number of requests allowed by the SCIM resource within a specified time frame to avoid throttling.

### `scim_group_schema`

- **Type**: `json_t`
- **Requirement**: recommended

SCIM provides a schema for representing groups, identified using the following schema URI: `urn:ietf:params:scim:schemas:core:2.0:Group` as defined in [RFC-7634](https://datatracker.ietf.org/doc/html/rfc7643). This attribute will capture key-value pairs for the scheme implemented in a SCIM resource.

### `scim_user_schema`

- **Type**: `json_t`
- **Requirement**: recommended

SCIM provides a resource type for user resources. The core schema for user is identified using the following schema URI: `urn:ietf:params:scim:schemas:core:2.0:User` as defined in [RFC-7634](https://datatracker.ietf.org/doc/html/rfc7643). his attribute will capture key-value pairs for the scheme implemented in a SCIM resource. This object is inclusive of both the basic and Enterprise User Schema Extension.

### `state`

- **Type**: `string_t`
- **Requirement**: optional

The provisioning state of the SCIM resource, normalized to the caption of the `state_id` value. In the case of `Other`, it is defined by the event source.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `state`

#### Enum values

- `0`: `Unknown` - The provisioning state of the SCIM resource is unknown.
- `1`: `Pending` - The SCIM resource is Pending activation or creation.
- `2`: `Active` - The SCIM resource is in an Active state, or otherwise enabled.
- `3`: `Failed` - The SCIM resource is in a Failed state.
- `4`: `Deleted` - The SCIM resource is in a Deleted state, or otherwise disabled.
- `99`: `Other` - The provisioning state of the SCIM resource is not mapped. See the `state` attribute, which contains a data source specific value.

The normalized state ID of the SCIM resource to reflect its activation status.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

A unique identifier for a SCIM resource as defined by the service provider.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

A String that is an identifier for the resource as defined by the provisioning client. The `externalId` may simplify identification of a resource between the provisioning client and the service provider by allowing the client to use a filter to locate the resource with an identifier from the provisioning domain, obviating the need to store a local mapping between the provisioning domain's identifier of the resource and the identifier used by the service provider.

### `url_string`

- **Type**: `url_t`
- **Requirement**: optional

The primary URL for SCIM API requests.

### `vendor_name`

- **Type**: `string_t`
- **Requirement**: optional

Name of the vendor or service provider implementing SCIM. E.g., `Okta`, `Auth0`, `Microsoft`.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

SCIM protocol version supported e.g., `SCIM 2.0`.
