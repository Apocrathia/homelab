# Session (session)

The Session object describes details about an authenticated session. e.g. Session Creation Time, Session Issuer.

- **Extends**: [Object (object)](object.md)

## Attributes

### `count`

- **Type**: `integer_t`
- **Requirement**: optional

The number of identical sessions spawned from the same source IP, destination IP, application, and content/threat type seen over a period of time.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the session was created.

### `credential_uid`

- **Type**: `string_t`
- **Requirement**: optional
- **Observable**: 19

The unique identifier of the user's credential. For example, AWS Access Key ID.

### `expiration_reason`

- **Type**: `string_t`
- **Requirement**: optional

The reason which triggered the session expiration.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The session expiration time.

### `is_mfa`

- **Type**: `boolean_t`
- **Requirement**: optional

Indicates whether Multi Factor Authentication was used during authentication.

### `is_remote`

- **Type**: `boolean_t`
- **Requirement**: recommended

The indication of whether the session is remote.

### `is_vpn`

- **Type**: `boolean_t`
- **Requirement**: optional

The indication of whether the session is a VPN session.

### `issuer`

- **Type**: `string_t`
- **Requirement**: recommended

The identifier of the session issuer.

### `terminal`

- **Type**: `string_t`
- **Requirement**: optional

The Pseudo Terminal associated with the session. Ex: the tty or pts value.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the session.

### `uid_alt`

- **Type**: `string_t`
- **Requirement**: optional

The alternate unique identifier of the session. e.g. AWS ARN - `arn:aws:sts::123344444444:assumed-role/Admin/example-session`.

### `uuid`

- **Type**: `uuid_t`
- **Requirement**: optional

The universally unique identifier of the session.
