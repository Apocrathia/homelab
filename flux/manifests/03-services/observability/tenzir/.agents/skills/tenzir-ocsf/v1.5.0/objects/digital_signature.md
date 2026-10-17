# Digital Signature (digital_signature)

The Digital Signature object contains information about the cryptographic mechanism used to verify the authenticity, integrity, and origin of the file or application.

- **Extends**: [Object (object)](object.md)

## Attributes

### `algorithm`

- **Type**: `string_t`
- **Requirement**: optional

The digital signature algorithm used to create the signature, normalized to the caption of 'algorithm_id'. In the case of 'Other', it is defined by the event source.

### `algorithm_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `algorithm`

#### Enum values

- `0`: `Unknown`
- `1`: `DSA` - Digital Signature Algorithm (DSA).
- `2`: `RSA` - Rivest-Shamir-Adleman (RSA) Algorithm.
- `3`: `ECDSA` - Elliptic Curve Digital Signature Algorithm.
- `4`: `Authenticode` - Microsoft Authenticode Digital Signature Algorithm.
- `99`: `Other`

The identifier of the normalized digital signature algorithm.

### `certificate`

- **Type**: [`certificate`](certificate.md)
- **Requirement**: recommended

The certificate object containing information about the digital certificate.

### `created_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The time when the digital signature was created.

### `developer_uid`

- **Type**: `string_t`
- **Requirement**: optional

The developer ID on the certificate that signed the file.

### `digest`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: optional

The message digest attribute contains the fixed length message hash representation and the corresponding hashing algorithm information.

### `state`

- **Type**: `string_t`
- **Requirement**: optional

The digital signature state defines the signature state, normalized to the caption of 'state_id'. In the case of 'Other', it is defined by the event source.

### `state_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `state`

#### Enum values

- `1`: `Valid` - The digital signature is valid.
- `2`: `Expired` - The digital signature is not valid due to expiration of certificate.
- `3`: `Revoked` - The digital signature is invalid due to certificate revocation.
- `4`: `Suspended` - The digital signature is invalid due to certificate suspension.
- `5`: `Pending` - The digital signature state is pending.

The normalized identifier of the signature state.
