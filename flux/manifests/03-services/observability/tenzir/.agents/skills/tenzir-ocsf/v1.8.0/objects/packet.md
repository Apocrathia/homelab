# Packet (packet)

The Packet object represents a single captured network packet and its associated metadata. It describes where the packet came from, how it is stored or encoded, and how it can be located within a capture file or stream. This object does not interpret protocol content; it only represents the captured packet data and its positioning information.

- **Extends**: [Object (object)](object.md)

## Attributes

### `encoding`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable name of the encoding used to represent the packet data in the `value` field. This should match the caption associated with `encoding_id`. If `encoding_id` is 99 (Other), this field contains the original data source–specific encoding value.

### `encoding_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `encoding`

#### Enum values

- `0`: `Unknown` - The encoding format of the packet data is not known.
- `1`: `Base64` - The packet data is encoded using Base64.
- `2`: `Hexadecimal` - The packet data is encoded as a hexadecimal string representation of the raw bytes.
- `3`: `URL Encoded` - The packet data is encoded using percent-encoding (URL encoding).
- `99`: `Other` - The encoding method is not mapped. Refer to the `encoding` field for the original source-specific value.

The normalized identifier of the encoding method used to represent the packet data as a string.

### `end_offset`

- **Type**: `long_t`
- **Requirement**: optional

The ending byte position of this packet within a capture file or stream.

### `format`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable name of the packet capture file format in which the packet is stored. This should match the caption associated with `format_id`. If `format_id` is 99 (Other), this field contains the original data source–specific format value.

### `format_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `format`

#### Enum values

- `0`: `Unknown` - The packet format is unknown.
- `1`: `PCAP` - Standard libpcap/tcpdump packet capture file format.
- `2`: `PCAPNG` - Next-generation PCAP format that supports multiple interfaces and enhanced metadata.
- `3`: `Snoop` - Solaris/Unix capture format.
- `4`: `ERF` - Extensible Record Format used by Endace network monitoring hardware.
- `5`: `NetMon` - Microsoft Network Monitor capture file format.
- `6`: `5Views` - Accellent 5Views packet capture format.
- `99`: `Other` - The packet format is not mapped. Refer to the `format` field for the original source-specific value.

The normalized identifier of the packet capture format.

### `sequence_number`

- **Type**: `long_t`
- **Requirement**: optional

The relative order number of this packet within its capture context (such as a PCAP file, network session, or reconstructed stream). This represents chronological capture order, distinct from both protocol-level sequencing (such as TCP sequence numbers).

### `source`

- **Type**: `string_t`
- **Requirement**: optional

The human-readable name describing how or where the packet was obtained. This should match the caption associated with `source_id`. If `source_id` is 99 (Other), this field contains the original data source–specific value.

### `source_id`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `source`

#### Enum values

- `0`: `Unknown` - The packet source is unknown.
- `1`: `Wire` - The packet was captured directly from a network interface.
- `2`: `Stream` - The packet was reconstructed or derived from a stream of packets.
- `3`: `Decoder` - The packet was generated or extracted by a protocol decoder or analysis engine.
- `4`: `TAP` - The packet was captured from a physical network Test Access Point (TAP) device used for passive monitoring.
- `5`: `SPAN` - The packet was captured from a switch Switched Port Analyzer (SPAN) or mirror port.
- `6`: `Endpoint` - The packet was captured by a host-based agent or endpoint detection and response (EDR) sensor.
- `7`: `Virtual` - The packet was captured from a virtual network interface, virtual switch, or container network.
- `99`: `Other` - The packet source is not mapped. Refer to the `source` field for the original source-specific value.

A normalized numeric identifier that specifies how the packet was obtained or generated.

### `start_offset`

- **Type**: `long_t`
- **Requirement**: optional

The starting byte position of this packet within a capture file or stream.

### `value`

- **Type**: `string_t`
- **Requirement**: required

The actual packet data, represented as a string. The format of this string is determined by the specified `encoding_id` (e.g., Base64, Hexadecimal, or URL Encoded).
