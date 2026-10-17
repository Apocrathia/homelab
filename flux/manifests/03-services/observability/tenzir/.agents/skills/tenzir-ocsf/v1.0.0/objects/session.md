# Session (session)

The Session object describes details about an authenticated session. e.g. Session Creation Time, Session Issuer. Defined by D3FEND [d3f:Session](https://d3fend.mitre.org/dao/artifact/d3f:Session/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the session was created.

### `credential_uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the user's credential. For example, AWS Access Key ID.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The session expiration time.

### `is_remote`

- **Type**: `boolean_t`
- **Requirement**: recommended

The indication of whether the session is remote.

### `issuer`

- **Type**: `string_t`
- **Requirement**: recommended

The identifier of the session issuer.

### `uid`

- **Type**: `string_t`
- **Requirement**: recommended

The unique identifier of the session.

### `uuid`

- **Type**: `uuid_t`
- **Requirement**: optional

The universally unique identifier of the session.
