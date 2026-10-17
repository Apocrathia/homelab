# Network Traffic (network_traffic)

The Network Traffic object describes characteristics of network traffic. Network traffic refers to data moving across a network at a given point of time.

- **Extends**: [Object (object)](object.md)

## Attributes

### `bytes`

- **Type**: `long_t`
- **Requirement**: recommended

The total number of bytes (in and out).

### `bytes_in`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes sent from the destination to the source.

### `bytes_missed`

- **Type**: `long_t`
- **Requirement**: optional

Indicates the number of bytes missed, which is representative of packet loss.

### `bytes_out`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes sent from the source to the destination.

### `chunks`

- **Type**: `long_t`
- **Requirement**: optional

The total number of chunks (in and out).

### `chunks_in`

- **Type**: `long_t`
- **Requirement**: optional

The number of chunks sent from the destination to the source.

### `chunks_out`

- **Type**: `long_t`
- **Requirement**: optional

The number of chunks sent from the source to the destination.

### `packets`

- **Type**: `long_t`
- **Requirement**: recommended

The total number of packets (in and out).

### `packets_in`

- **Type**: `long_t`
- **Requirement**: optional

The number of packets sent from the destination to the source.

### `packets_out`

- **Type**: `long_t`
- **Requirement**: optional

The number of packets sent from the source to the destination.
