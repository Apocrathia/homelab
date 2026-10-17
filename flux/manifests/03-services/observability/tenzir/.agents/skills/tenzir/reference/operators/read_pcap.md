---
title: "read_pcap"
canonical: https://tenzir.com/docs/reference/operators/read_pcap
source: https://tenzir.com/docs/reference/operators/read_pcap.md
section: "Docs"
---

# read_pcap

> Parses PCAP and PCAPNG byte streams into packet events.

Parses PCAP and PCAPNG byte streams into packet events.

```tql
read_pcap [emit_file_headers=bool]
```

## Description

The `read_pcap` operator converts raw bytes representing a [PCAP](https://datatracker.ietf.org/doc/id/draft-gharris-opsawg-pcap-00.html) or [PCAPNG](https://www.ietf.org/archive/id/draft-tuexen-opsawg-pcapng-05.html) file into events. It detects the format from the file header.

For PCAPNG input, the operator supports multiple interfaces, timestamp resolutions, byte orders, and concatenated sections. It skips blocks that don’t contain packets or interface descriptions.

### `emit_file_headers = bool (optional)`

Emit a `pcap.file_header` event that represents a classic PCAP file header. If present, the parser injects this additional event before the subsequent stream of packets. This option has no effect on PCAPNG input.

Emitting this extra event makes it possible to seed [`write_pcap`](https://tenzir.com/docs/reference/operators/write_pcap.md) with a file header from the input. This allows you to preserve timestamp formatting (microseconds vs. nanoseconds) and byte order in packet headers.

When the parser processes a concatenated stream of PCAP files, `emit_file_headers=true` also re-emits every intermediate file header as a separate event.

Use this option when you want to reproduce the original trace layout.

## Schemas

The operator emits events with the following schemas.

### `pcap.file_header`

Contains the global header for one PCAP trace.

| Field           | Type     | Description                                 |
| --------------- | -------- | ------------------------------------------- |
| `magic_number`  | `uint64` | The PCAP magic number.                      |
| `major_version` | `uint64` | The major PCAP format version.              |
| `minor_version` | `uint64` | The minor PCAP format version.              |
| `reserved1`     | `uint64` | Reserved header field.                      |
| `reserved2`     | `uint64` | Reserved header field.                      |
| `snaplen`       | `uint64` | The maximum captured packet size.           |
| `linktype`      | `uint64` | The link-layer type for subsequent packets. |

### `pcap.packet`

Contains one captured packet from the trace.

| Field                    | Type     | Description                             |
| ------------------------ | -------- | --------------------------------------- |
| `timestamp`              | `time`   | The time when the packet was captured.  |
| `linktype`               | `uint64` | The link-layer type of the packet.      |
| `original_packet_length` | `uint64` | The length of the original packet.      |
| `captured_packet_length` | `uint64` | The length of the captured packet.      |
| `data`                   | `blob`   | The captured packet payload.            |
| `section_id`             | `uint64` | The PCAPNG section index, if present.   |
| `interface_id`           | `uint64` | The PCAPNG interface index, if present. |

## Examples

### Read packets from a PCAP file

```tql
from_file "/tmp/trace.pcap" {
  read_pcap
}
```

### Read packets from a PCAPNG file

```tql
from_file "/tmp/trace.pcapng" {
  read_pcap
}
```

### Capture packets from `en1` and preserve file headers

```tql
from_nic "en1" {
  read_pcap emit_file_headers=true
}
```

## See Also

* [`from_nic`](https://tenzir.com/docs/reference/operators/from_nic.md)
* [`write_pcap`](https://tenzir.com/docs/reference/operators/write_pcap.md)
* [`decapsulate`](https://tenzir.com/docs/reference/functions/decapsulate.md)
