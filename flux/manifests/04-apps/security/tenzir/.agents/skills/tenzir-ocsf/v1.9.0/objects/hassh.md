# HASSH (hassh)

The HASSH object contains SSH network fingerprinting values for specific client/server implementations. It provides a standardized way of identifying and categorizing SSH connections based on their unique characteristics and behavior.

- **Extends**: [Object (object)](object.md)

## Attributes

### `algorithm`

- **Type**: `string_t`
- **Requirement**: recommended

The concatenation of key exchange, encryption, authentication and compression algorithms (separated by ';'). NOTE: This is not the underlying algorithm for the hash implementation.

### `fingerprint`

- **Type**: [`fingerprint`](fingerprint.md)
- **Requirement**: required

The hash of the key exchange, encryption, authentication and compression algorithms.
