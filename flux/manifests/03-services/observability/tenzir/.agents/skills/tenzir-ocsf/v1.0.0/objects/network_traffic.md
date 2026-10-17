# Network Traffic (network_traffic)

The Network Traffic object describes characteristics of network traffic. Network traffic refers to data moving across a network at a given point of time. Defined by D3FEND [d3f:NetworkTraffic](https://d3fend.mitre.org/dao/artifact/d3f:NetworkTraffic/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `bytes`

- **Type**: `long_t`
- **Requirement**: recommended

The total number of bytes (in and out).

### `bytes_in`

- **Type**: `long_t`

The number of bytes sent from the destination to the source.

### `bytes_out`

- **Type**: `long_t`

The number of bytes sent from the source to the destination.

### `packets`

- **Type**: `long_t`
- **Requirement**: recommended

The total number of packets (in and out).

### `packets_in`

- **Type**: `long_t`

The number of packets sent from the destination to the source.

### `packets_out`

- **Type**: `long_t`

The number of packets sent from the source to the destination.
