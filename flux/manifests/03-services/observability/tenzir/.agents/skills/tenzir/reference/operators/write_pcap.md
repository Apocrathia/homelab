---
title: "write_pcap"
canonical: https://tenzir.com/docs/reference/operators/write_pcap
source: https://tenzir.com/docs/reference/operators/write_pcap.md
section: "Docs"
---

# write_pcap

> Serializes packet events as a PCAP or PCAPNG byte stream.

Serializes packet events as a PCAP or PCAPNG byte stream.

```tql
write_pcap [format=string]
```

## Description

The `write_pcap` operator transforms packet events into a [PCAP](https://datatracker.ietf.org/doc/id/draft-gharris-opsawg-pcap-00.html) or [PCAPNG](https://www.ietf.org/archive/id/draft-tuexen-opsawg-pcapng-05.html) byte stream.

The operator accepts `pcap.packet` events. When present, it also uses `pcap.file_header` events emitted by [`read_pcap`](https://tenzir.com/docs/reference/operators/read_pcap.md) to preserve the original timestamp precision and byte order.

Each packet needs a `linktype`, a `timestamp`, and its `data`. The lengths are optional:

* A missing `captured_packet_length` defaults to the size of `data`.
* A missing `original_packet_length` defaults to the captured length, which marks the packet as not truncated. Provide `original_packet_length` alone to write a truncated packet.

If no `pcap.file_header` event is present, `write_pcap` generates a file header from the first packet’s `linktype` and writes timestamps with nanosecond precision.

The default `format="auto"` preserves PCAPNG input from [`read_pcap`](https://tenzir.com/docs/reference/operators/read_pcap.md) and otherwise writes classic PCAP.

### `format = string (optional)`

Controls the output format. The supported values are:

* `"auto"` selects PCAPNG for packet events with `section_id` and `interface_id` fields and classic PCAP otherwise.
* `"pcap"` always writes classic PCAP.
* `"pcapng"` always writes PCAPNG.

The structured representation of packets has the `pcap.packet` schema:

```yaml
pcap.packet:
  record:
    - linktype: uint64
    - timestamp: time
    - captured_packet_length: uint64
    - original_packet_length: uint64
    - data: blob
    - section_id: uint64 # PCAPNG input only
    - interface_id: uint64 # PCAPNG input only
```

## Examples

### Write a live capture to a PCAP file

```tql
from_nic "en1"
to_file "/logs/packets.pcap" {
  write_pcap
}
```

### Write a PCAPNG file

```tql
from_nic "en1"
to_file "/logs/packets.pcapng" {
  write_pcap format="pcapng"
}
```

### Write packets from raw bytes

The packet lengths default to the size of the data:

```tql
from {
  linktype: 1,
  timestamp: 2020-01-02T03:04:05Z,
  data: b"\x00\x01\x02",
}
@name = "pcap.packet"
to_file "/tmp/packet.pcap" {
  write_pcap
}
```

### Round-trip a PCAP file while preserving its file header

```tql
from_file "/tmp/trace.pcap" {
  read_pcap emit_file_headers=true
}
to_file "/tmp/trace-copy.pcap" {
  write_pcap
}
```

## See Also

* [`from_nic`](https://tenzir.com/docs/reference/operators/from_nic.md)
* [`read_pcap`](https://tenzir.com/docs/reference/operators/read_pcap.md)
