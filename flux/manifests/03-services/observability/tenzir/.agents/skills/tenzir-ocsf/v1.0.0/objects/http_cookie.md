# HTTP Cookie (http_cookie)

The HTTP Cookie object, also known as a web cookie or browser cookie, contains details and values pertaining to a small piece of data that a server sends to a user's web browser. This data is then stored by the browser and sent back to the server with subsequent requests, allowing the server to remember and track certain information about the user's browsing session or preferences.

- **Extends**: [Object (object)](object.md)

## Attributes

### `domain`

- **Type**: `string_t`
- **Requirement**: optional

The name of the domain.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The expiration time of the HTTP cookie.

### `http_only`

- **Type**: `boolean_t`
- **Requirement**: optional

A cookie attribute to make it inaccessible via JavaScript

### `name`

- **Type**: `string_t`
- **Requirement**: required

The HTTP cookie name.

### `path`

- **Type**: `string_t`
- **Requirement**: optional

The path of the HTTP cookie.

### `samesite`

- **Type**: `string_t`
- **Requirement**: optional

The cookie attribute that lets servers specify whether/when cookies are sent with cross-site requests. Values are: Strict, Lax or None

### `secure`

- **Type**: `boolean_t`
- **Requirement**: optional

The cookie attribute to only send cookies to the server with an encrypted request over the HTTPS protocol.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The HTTP cookie value.
