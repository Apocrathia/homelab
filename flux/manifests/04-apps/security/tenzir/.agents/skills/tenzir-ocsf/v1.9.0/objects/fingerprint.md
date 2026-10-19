# Fingerprint (fingerprint)

The Fingerprint object provides detailed information about a fingerprint, which is a compact representation of data used to identify a longer piece of information, such as a public key, file content, or application implementation. It contains the algorithm or scheme and value of the fingerprint, enabling efficient and reliable identification of the associated data.

- **Extends**: [Object (object)](object.md)

## Attributes

### `algorithm`

- **Type**: `string_t`
- **Requirement**: optional

The algorithm or scheme used to create the fingerprint, normalized to the caption of `algorithm_id`. In the case of `Other`, it is defined by the event source.

### `algorithm_id`

- **Type**: `integer_t`
- **Requirement**: required
- **Sibling**: `algorithm`

#### Enum values

- `0`: `Unknown`
- `1`: `MD5` - MD5 message-digest algorithm producing a 128-bit (16-byte) hash value.
- `2`: `SHA-1` - Secure Hash Algorithm 1 producing a 160-bit (20-byte) hash value.
- `3`: `SHA-256` - Secure Hash Algorithm 2 producing a 256-bit (32-byte) hash value.
- `4`: `SHA-512` - Secure Hash Algorithm 2 producing a 512-bit (64-byte) hash value.
- `5`: `CTPH` - The ssdeep generated fuzzy checksum. Also known as Context Triggered Piecewise Hash (CTPH).
- `6`: `TLSH` - The TLSH fuzzy hashing algorithm.
- `7`: `quickXorHash` - Microsoft simple non-cryptographic hash algorithm that works by XORing the bytes in a circular-shifting fashion.
- `8`: `SHA-224` - Secure Hash Algorithm 2 producing a 224-bit (28-byte) hash value.
- `9`: `SHA-384` - Secure Hash Algorithm 2 producing a 384-bit (48-byte) hash value.
- `10`: `SHA-512/224` - Secure Hash Algorithm 2 producing a 512-bit (64-byte) hash value truncated to a 224-bit (28-byte) hash value.
- `11`: `SHA-512/256` - Secure Hash Algorithm 2 producing a 512-bit (64-byte) hash value truncated to a 256-bit (32-byte) hash value.
- `12`: `SHA3-224` - Secure Hash Algorithm 3 producing a 224-bit (28-byte) hash value.
- `13`: `SHA3-256` - Secure Hash Algorithm 3 producing a 256-bit (32-byte) hash value.
- `14`: `SHA3-384` - Secure Hash Algorithm 3 producing a 384-bit (48-byte) hash value.
- `15`: `SHA3-512` - Secure Hash Algorithm 3 producing a 512-bit (64-byte) hash value.
- `16`: `xxHash H3 64-bit` - xxHash H3 producing a 64-bit hash value.
- `17`: `xxHash H3 128-bit` - xxHash H3 producing a 128-bit hash value.
- `18`: `Imphash` - Import hash (imphash) based on the import table of a Portable Executable (PE) file producing a 128-bit (16-byte) hash value.
- `19`: `NPF` - Network Protocol Fingerprint (NPF) used to identify network protocols and applications.
- `20`: `HASSH` - HASSH is a network fingerprinting standard which can be used to identify specific SSH client and server implementations.
- `99`: `Other`

The identifier of the normalized algorithm or scheme, which was used to create the fingerprint.

### `encoding`

- **Type**: `string_t`
- **Requirement**: optional

The encoding of the `value` attribute, normalized to the caption of `encoding_id`. In the case of `Other`, it is defined by the event source.

### `encoding_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `encoding`

#### Enum values

- `0`: `Unknown` - The encoding of the fingerprint value is not known.
- `1`: `Hex` - The fingerprint value is encoded as a lowercase or uppercase hexadecimal string.
- `2`: `Base64` - The fingerprint value is encoded using standard Base64.
- `3`: `Base64URL` - The fingerprint value is encoded using URL- and filename-safe Base64.
- `99`: `Other` - The encoding of the fingerprint value is not mapped. See the `encoding` attribute, which contains a data source specific value.

The normalized identifier of the encoding used to represent the fingerprint bytes as the string in `value`. A verifier must decode `value` using this encoding to recover the raw hash bytes.

### `serialization`

- **Type**: `string_t`
- **Requirement**: optional

The canonical serialization scheme used to produce the deterministic byte sequence that was fingerprinted, normalized to the caption of `serialization_id`. In the case of `Other`, it is defined by the event source.

### `serialization_id`

- **Type**: `integer_t`
- **Requirement**: optional
- **Sibling**: `serialization`

#### Enum values

- `0`: `Unknown`
- `1`: `Flat` - No canonical serialization was applied; the fingerprint is computed over the data's raw byte sequence, such as the content of a disk file or any other opaque byte stream.
- `2`: `JCS` - JSON Canonicalization Scheme - deterministic JSON serialization of the structured data prior to hashing.
- `3`: `JWS` - JSON Web Signature - the JWS Signing Input, i.e. BASE64URL(protected header) '.' BASE64URL(payload).
- `4`: `COSE` - CBOR Object Signing and Encryption - the CBOR Sig_structure used as the binary input.
- `5`: `DSSE` - Dead Simple Signing Envelope - the PAE (Pre-Authentication Encoding) canonical input. Note: DSSE is a signing-envelope scheme, not a hash algorithm; the hash algorithm is carried in `algorithm_id`.
- `6`: `Authenticode` - The Portable Executable (PE) Image Hash procedure that canonicalizes the PE structure into the byte sequence fed to the digest, excluding specified header fields and digesting sections in a defined order.
- `7`: `Code Signing` - The procedure that describes how hashes of code and other structures form the Code Directory message that is digested.
- `8`: `App Package` - The Windows Application Package signing procedure that describes how file hashes are stored in the manifest, and how that manifest is signed.
- `99`: `Other`

The identifier of the normalized canonical serialization scheme used to produce the deterministic byte sequence that was fingerprinted. A verifier must apply the same scheme to reproduce the fingerprinted input. Use `Flat` where the fingerprinted data is an opaque byte sequence, such as file content, to which no canonical serialization was applied. Distinct from `algorithm_id`, which identifies how the resulting bytes were hashed.

### `value`

- **Type**: `file_hash_t`
- **Requirement**: required

The fingerprint value.

Note: This uses type `file_hash_t` ("Hash"), which has been generalized for all fingerprints but retains the same name and caption for backwards compatibility.
