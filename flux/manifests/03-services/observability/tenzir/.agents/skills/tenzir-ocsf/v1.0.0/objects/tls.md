# Transport Layer Security (TLS) (tls)

The Transport Layer Security (TLS) object describes the negotiated TLS protocol used for secure communications over an establish network connection.

- **Extends**: [Object (object)](object.md)

## Attributes

### `alert`

- **Type**: `integer_t`
- **Requirement**: optional

The integer value of TLS alert if present. The alerts are defined in the TLS specification in [RFC-2246](https://datatracker.ietf.org/doc/html/rfc2246).

### `certificate`

- **Type**: [`certificate`](certificate.md)
- **Requirement**: recommended

The certificate object containing information about the digital certificate.

### `certificate_chain`

- **Type**: `string_t`
- **Requirement**: recommended

The Chain of Certificate Serial Numbers field provides a chain of Certificate Issuer Serial Numbers leading to the Root Certificate Issuer.

### `cipher`

- **Type**: `string_t`
- **Requirement**: recommended

The negotiated cipher suite.

### `client_ciphers`

- **Type**: `string_t`
- **Requirement**: recommended

The client cipher suites that were exchanged during the TLS handshake negotiation.

### `extension_list`

- **Type**: `tls_extension`
- **Requirement**: optional

The list of TLS extensions.

### `handshake_dur`

- **Type**: `integer_t`
- **Requirement**: optional

The amount of total time for the TLS handshake to complete after the TCP connection is established, including client-side delays, in milliseconds.

### `ja3_hash`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

The MD5 hash of a JA3 string.

### `ja3s_hash`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: recommended

The MD5 hash of a JA3S string.

### `key_length`

- **Type**: `integer_t`
- **Requirement**: optional

The length of the encryption key.

### `sans`

- **Type**: [`san`](san.md)
- **Requirement**: optional

The list of subject alternative names that are secured by a specific certificate.

### `server_ciphers`

- **Type**: `string_t`
- **Requirement**: optional

The server cipher suites that were exchanged during the TLS handshake negotiation.

### `sni`

- **Type**: `string_t`
- **Requirement**: recommended

The Server Name Indication (SNI) extension sent by the client.

### `version`

- **Type**: `string_t`
- **Requirement**: required

The TLS protocol version.
