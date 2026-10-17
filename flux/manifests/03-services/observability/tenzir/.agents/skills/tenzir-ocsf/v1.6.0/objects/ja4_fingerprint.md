# JA4+ Fingerprint (ja4_fingerprint)

The JA4+ fingerprint object provides detailed fingerprint information about various aspects of network traffic which is both machine and human readable.

- **Extends**: [Object (object)](object.md)

## Attributes

### `section_a`

- **Type**: `string_t`
- **Requirement**: optional

The 'a' section of the JA4 fingerprint.

### `section_b`

- **Type**: `string_t`
- **Requirement**: optional

The 'b' section of the JA4 fingerprint.

### `section_c`

- **Type**: `string_t`
- **Requirement**: optional

The 'c' section of the JA4 fingerprint.

### `section_d`

- **Type**: `string_t`
- **Requirement**: optional

The 'd' section of the JA4 fingerprint.

### `type`

- **Type**: `string_t`
- **Requirement**: optional

The JA4+ fingerprint type as defined by [FoxIO](https://blog.foxio.io/ja4+-network-fingerprinting target=), normalized to the caption of 'type_id'. In the case of 'Other', it is defined by the event source.

### `type_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `type`

#### Enum values

- `0`: `Unknown`
- `1`: `JA4` - TLS Client Fingerprint.
- `2`: `JA4Server` - TLS Server Response/Session Fingerprint.
- `3`: `JA4HTTP` - HTTP Client Fingerprint.
- `4`: `JA4Latency` - Latency Measurement/Light Distance Fingerprint.
- `5`: `JA4X509` - X509 TLS Certificate Fingerprint.
- `6`: `JA4SSH` - SSH Traffic Fingerprint.
- `7`: `JA4TCP` - Passive TCP Client Fingerprint.
- `8`: `JA4TCPServer` - Passive TCP Server Fingerprint.
- `9`: `JA4TCPScan` - Active TCP Server Fingerprint.
- `99`: `Other`

The identifier of the JA4+ fingerprint type.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The JA4+ fingerprint value.
