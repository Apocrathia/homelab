# Network Traffic (network_traffic)

The Network Traffic object describes characteristics of network traffic over a time period. The metrics represent network data transferred between source and destination during an observation window.

- **Extends**: [Object (object)](object.md)

## Attributes

### `bytes`

- **Type**: `long_t`
- **Requirement**: recommended

The total number of bytes transferred in both directions (sum of bytes_in and bytes_out).

### `bytes_in`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes sent from the destination to the source (inbound direction).

### `bytes_missed`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes that were missed during observation, typically due to packet loss or sampling limitations.

### `bytes_out`

- **Type**: `long_t`
- **Requirement**: optional

The number of bytes sent from the source to the destination (outbound direction).

### `chunks`

- **Type**: `long_t`
- **Requirement**: optional

The total number of chunks transferred in both directions (sum of chunks_in and chunks_out).

### `chunks_in`

- **Type**: `long_t`
- **Requirement**: optional

The number of chunks sent from the destination to the source (inbound direction).

### `chunks_out`

- **Type**: `long_t`
- **Requirement**: optional

The number of chunks sent from the source to the destination (outbound direction).

### `end_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The end time of the observation or reporting period.

### `packets`

- **Type**: `long_t`
- **Requirement**: recommended

The total number of packets transferred in both directions (sum of packets_in and packets_out).

### `packets_in`

- **Type**: `long_t`
- **Requirement**: optional

The number of packets sent from the destination to the source (inbound direction).

### `packets_out`

- **Type**: `long_t`
- **Requirement**: optional

The number of packets sent from the source to the destination (outbound direction).

### `start_time`

- **Type**: `timestamp_t`
- **Requirement**: optional

The start time of the observation or reporting period.

### `timespan`

- **Type**: [`timespan`](timespan.md)
- **Requirement**: optional

The time span object representing the duration of the observation or reporting period.
