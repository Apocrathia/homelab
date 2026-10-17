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
- `4`: `Authenticode` - Authenticode Digital Signature Algorithm.
- `5`: `Code Signing` - Code Signing Algorithm.
- `6`: `App Package` - Application Package Signing Algorithm.
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

### `serialization`

- **Type**: `string_t`
- **Requirement**: optional

The canonical serialization or signing-envelope scheme used to produce the deterministic byte sequence that was signed, normalized to the caption of `serialization_id`. In the case of `Other`, it is defined by the event source.

### `serialization_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `serialization`

#### Enum values

- `0`: `Unknown`
- `1`: `Flat` - No canonical serialization or signing envelope was applied; the signature is computed over the data's raw byte sequence, such as the content of a disk file or any other opaque byte stream.
- `2`: `JCS` - JSON Canonicalization Scheme - deterministic JSON serialization of the structured data prior to signing.
- `3`: `JWS` - JSON Web Signature - the JWS Signing Input, i.e. BASE64URL(protected header) '.' BASE64URL(payload).
- `4`: `COSE` - CBOR Object Signing and Encryption - the CBOR Sig_structure used as the binary signing input.
- `5`: `DSSE` - Dead Simple Signing Envelope - the PAE (Pre-Authentication Encoding) canonical signing input. Note: DSSE is a signing-envelope scheme, not a hash algorithm; any payload hash is carried separately in the fingerprint object.
- `6`: `Authenticode` - The Portable Executable (PE) Image Hash procedure that canonicalizes the PE structure into the byte sequence fed to the digest, excluding specified header fields and digesting sections in a defined order. Authenticode bundles canonicalization and signing format: when used, `algorithm_id` is also set to the `Authenticode` enum value.
- `7`: `Code Signing` - The procedure that describes how hashes of code and other structures form the Code Directory message that is signed. When used, `algorithm_id` is also set to the `Code Signing` enum value.
- `8`: `App Package` - The Windows Application Package signing procedure that describes how file hashes are stored in the manifest, and how that manifest is signed.
- `99`: `Other`

The identifier of the normalized canonical serialization or signing-envelope scheme used to produce the deterministic byte sequence that was signed. A verifier must apply the same scheme to reproduce the signing input. Use `Flat` where the signed data is an opaque byte sequence, such as file content, to which no canonical serialization was applied. Distinct from `algorithm_id`, which identifies how the resulting bytes were signed; some signing formats (e.g. `Authenticode`) define their own canonicalization and populate both fields.

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
- `2`: `Expired` - The digital signature is invalid because its timestamp does not fall within the certificate's validity period.
- `3`: `Revoked` - The digital signature is invalid due to certificate revocation.
- `4`: `Suspended` - The digital signature is invalid due to certificate suspension.
- `5`: `Pending` - The digital signature state is pending.
- `6`: `Untrusted` - The digital signature is invalid because the certificate is rooted in an untrusted CA or is an untrusted self-signed certificate.
- `7`: `Distrusted` - The digital signature is invalid because the certificate is explicitly distrusted. Note that whereas revocation is global, distrust reflects local IT/security policy.
- `8`: `WrongUsage` - The digital signature is invalid because the certificate is not intended for code signing purposes.
- `9`: `Bad` - The digital signature is cryptographically invalid, e.g. a mismatched digest. This indicates possible tampering.
- `10`: `Broken` - The digital signature is malformed and could not be processed.

The normalized identifier of the signature state.
