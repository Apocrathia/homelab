# TLS Extension (tls_extension)

The TLS Extension object describes additional attributes that extend the base Transport Layer Security (TLS) object.

- **Extends**: [Object (object)](object.md)

## Attributes

### `data`

- **Type**: `json_t`
- **Requirement**: recommended

The data contains information specific to the particular extension type.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The TLS extension type. For example: `Server Name`.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `server_name` - The Server Name Indication extension.
- `1`: `maximum_fragment_length` - The Maximum Fragment Length Negotiation extension.
- `5`: `status_request` - The Certificate Status Request extension.
- `10`: `supported_groups` - The Supported Groups extension.
- `13`: `signature_algorithms` - The Signature Algorithms extension.
- `14`: `use_srtp` - The Use SRTP data protection extension.
- `15`: `heartbeat` - The Heartbeat extension.
- `16`: `application_layer_protocol_negotiation` - The Application-Layer Protocol Negotiation extension.
- `18`: `signed_certificate_timestamp` - The Signed Certificate Timestamp extension.
- `19`: `client_certificate_type` - The Client Certificate Type extension.
- `20`: `server_certificate_type` - The Server Certificate Type extension.
- `21`: `padding` - The Padding extension.
- `41`: `pre_shared_key` - The Pre Shared Key extension.
- `42`: `early_data` - The Early Data extension.
- `43`: `supported_versions` - The Supported Versions extension.
- `44`: `cookie` - The Cookie extension.
- `45`: `psk_key_exchange_modes` - The Pre-Shared Key Exchange Modes extension.
- `47`: `certificate_authorities` - The Certificate Authorities extension.
- `48`: `oid_filters` - The OID Filters extension.
- `49`: `post_handshake_auth` - The Post-Handshake Client Authentication extension.
- `50`: `signature_algorithms_cert` - The Signature Algorithms extension.
- `51`: `key_share` - The Key Share extension.

The TLS extension type identifier. See [The Transport Layer Security (TLS) extension page](https://datatracker.ietf.org/doc/html/rfc8446#page-35).
