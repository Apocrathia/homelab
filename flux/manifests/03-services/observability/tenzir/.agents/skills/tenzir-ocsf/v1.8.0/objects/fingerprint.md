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

### `value`

- **Type**: `file_hash_t`
- **Requirement**: required

The fingerprint value.

Note: This uses type `file_hash_t` ("Hash"), which has been generalized for all fingerprints but retains the same name and caption for backwards compatibility.
