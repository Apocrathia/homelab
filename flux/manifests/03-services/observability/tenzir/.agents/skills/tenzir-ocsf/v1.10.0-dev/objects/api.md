# API (api)

The API, or Application Programming Interface, object represents  information pertaining to an API request and response.

- **Extends**: [Object (object)](object.md)

## Attributes

### `group`

- **Type**: [`group`](group.md)
- **Requirement**: optional

The information pertaining to the API group.

### `operation`

- **Type**: `string_t`
- **Requirement**: required

Verb/Operation associated with the request

### `request`

- **Type**: [`request`](request.md)
- **Requirement**: recommended

Details pertaining to the API request.

### `response`

- **Type**: [`response`](response.md)
- **Requirement**: recommended

Details pertaining to the API response.

### `service`

- **Type**: [`service`](service.md)
- **Requirement**: optional

The information pertaining to the API service.

### `token`

- **Type**: [`token`](token.md)
- **Requirement**: optional

The API or client token used to authenticate or authorize the API request. This attribute contains the base `token` object that represents: (1) IdP-issued client tokens (type_id: 6) such as Okta API tokens or Microsoft Entra ID Application Registration client secrets, or (2) generic API tokens/keys (type_id: 7) used for SaaS application authentication. Use this attribute when the API request was authenticated using a token that should be tracked as part of the API activity event. Note: Protocol-specific authentication tokens (Kerberos, OIDC, SAML) should be represented using `authentication_token` in authentication events, not in API activity events.

### `version`

- **Type**: `string_t`
- **Requirement**: optional

The version of the API service.
