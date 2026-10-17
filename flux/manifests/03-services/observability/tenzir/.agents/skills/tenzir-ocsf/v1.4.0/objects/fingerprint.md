# Fingerprint (fingerprint)

The Fingerprint object provides detailed information about a digital fingerprint, which is a compact representation of data used to identify a longer piece of information, such as a public key or file content. It contains the algorithm and value of the fingerprint, enabling efficient and reliable identification of the associated data.

- **Extends**: [Object (object)](object.md)

## Attributes

### `algorithm`

- **Type**: `string_t`
- **Requirement**: optional

The hash algorithm used to create the digital fingerprint, normalized to the caption of `algorithm_id`. In the case of `Other`, it is defined by the event source.

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
- `99`: `Other`

The identifier of the normalized hash algorithm, which was used to create the digital fingerprint.

### `value`

- **Type**: `file_hash_t`
- **Requirement**: required

The digital fingerprint value.
