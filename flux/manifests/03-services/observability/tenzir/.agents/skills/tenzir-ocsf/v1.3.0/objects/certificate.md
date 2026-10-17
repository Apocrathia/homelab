# Digital Certificate (certificate)

The Digital Certificate, also known as a Public Key Certificate, object contains information about the ownership and usage of a public key. It serves as a means to establish trust in the authenticity and integrity of the public key and the associated entity. Defined by D3FEND [d3f:Certificate](https://d3fend.mitre.org/dao/artifact/d3f:Certificate/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The time when the certificate was created.

### `expiration_time`

- **Type**: `timestamp_t`
- **Requirement**: recommended

The expiration time of the certificate.

### `fingerprints`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: required

The fingerprint list of the certificate.

### `issuer`

- **Type**: `string_t`
- **Requirement**: required

The certificate issuer distinguished name.

### `is_self_signed`

- **Type**: `boolean_t`
- **Requirement**: recommended

Denotes whether a digital certificate is self-signed or signed by a known certificate authority (CA).

### `serial_number`

- **Type**: `string_t`
- **Requirement**: required

The serial number of the certificate used to create the digital signature.

### `subject`

- **Type**: `string_t`
- **Requirement**: recommended

The certificate subject distinguished name.

### `uid`

- **Type**: `string_t`
- **Requirement**: optional

The unique identifier of the certificate.

### `version`

- **Type**: `string_t`
- **Requirement**: recommended

The certificate version.
