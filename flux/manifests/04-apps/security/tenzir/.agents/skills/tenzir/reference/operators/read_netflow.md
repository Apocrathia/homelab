---
title: "read_netflow"
canonical: https://tenzir.com/docs/reference/operators/read_netflow
source: https://tenzir.com/docs/reference/operators/read_netflow.md
section: "Docs"
---

# read_netflow

> Parses NetFlow v5, NetFlow v9, and IPFIX messages into flow events.

Parses NetFlow v5, NetFlow v9, and IPFIX messages into flow events.

```tql
read_netflow
```

## Description

The `read_netflow` operator detects the protocol version of every message. You don’t need to select NetFlow v5, NetFlow v9, or IPFIX in advance, and one byte stream can contain consecutive messages with different versions.

The operator accepts two input forms:

* A raw byte stream, such as the output of [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md). Message boundaries can cross input chunks.
* Events that each represent one binary NetFlow or IPFIX message. The `data` field must contain a `blob`. An optional `peer` record can provide the exporter endpoint as `{ip: ip, port: int64}`. The [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md) operator produces this shape when you set `binary=true`, but other message-oriented sources can provide only `data` when exporter metadata isn’t available.

NetFlow v5 uses fixed records and doesn’t require template state. NetFlow v9 and IPFIX messages can define templates, options templates, and data sets. The operator retains templates across messages and buffers a data set when its template hasn’t arrived yet. It decodes the buffered data after the matching template arrives. The buffer and template state have fixed limits; the operator emits warnings when data expires or state must be evicted.

When an input event contains a `peer` record, the operator copies it to `netflow.exporter` and uses it to keep template state separate for each exporter:

* NetFlow v9 identifies an exporter by `peer.ip` and the source ID. A changing `peer.port` doesn’t create a new exporter.
* IPFIX identifies an exporter by `peer.ip`, `peer.port`, and the observation domain ID.

When no `peer` metadata is available, whether from a raw byte stream or message events, the operator uses one implicit exporter for each protocol version and domain ID. Don’t combine messages from different exporters that may use the same domain and template IDs without adding `peer` metadata.

NetFlow v9 exporters report their system uptime. When the uptime moves backward, the operator treats the message as an exporter restart and discards the exporter’s templates. It also honors IPFIX template withdrawals and template replacements.

Checkpoint snapshots retain exporter templates. They don’t retain undecoded data sets that are waiting for a template.

### Information elements

The operator uses the [IANA IPFIX Information Element registry](https://www.iana.org/assignments/ipfix/ipfix.xhtml) to name and type standard NetFlow v9 and IPFIX fields. It converts names to snake case, such as `sourceIPv4Address` to `source_ipv4_address`.

| Information element type | Tenzir type |
| ------------------------ | ----------- |
| Unsigned integer         | `uint64`    |
| Signed integer           | `int64`     |
| Floating point           | `double`    |
| Boolean                  | `bool`      |
| String                   | `string`    |
| Date and time            | `time`      |
| IPv4 or IPv6 address     | `ip`        |
| MAC address              | `string`    |
| Octet array              | `blob`      |

The decoder supports reduced-size integer fields and variable-length fields. It renders MAC addresses as colon-separated lowercase strings, such as `01:23:45:67:89:ab`.

Unknown standard elements use the field name `ie_<id>`. Unknown enterprise elements use `pen_<enterprise-number>_ie_<id>`. Their values remain `blob` values so that the operator doesn’t discard data. Structured information elements that require nested template decoding also remain blobs and produce a warning. When one template repeats a field name, later occurrences receive a numeric suffix such as `_2`.

## Schemas

The message version determines the event schema:

* `netflow.v5`
* `netflow.v9`
* `netflow.ipfix`

Every event contains a `netflow` metadata record. The remaining top-level fields come from the fixed NetFlow v5 record or the matching NetFlow v9 or IPFIX template.

| Metadata field                  | Type       | Availability         | Description                                   |
| ------------------------------- | ---------- | -------------------- | --------------------------------------------- |
| `netflow.version`               | `uint64`   | All events           | The protocol version: `5`, `9`, or `10`.      |
| `netflow.record_type`           | `string`   | All events           | `"flow"` or `"options"`.                      |
| `netflow.export_time`           | `time`     | All events           | The export timestamp from the message header. |
| `netflow.sequence_number`       | `uint64`   | All events           | The exporter sequence number.                 |
| `netflow.observation_domain_id` | `uint64`   | NetFlow v9 and IPFIX | The source ID or observation domain ID.       |
| `netflow.template_id`           | `uint64`   | NetFlow v9 and IPFIX | The template used to decode the record.       |
| `netflow.sys_uptime`            | `duration` | NetFlow v5 and v9    | The exporter uptime from the message header.  |
| `netflow.exporter.ip`           | `ip`       | Input with `peer`    | The IP address from the `peer` record.        |
| `netflow.exporter.port`         | `int64`    | Input with `peer`    | The port from the `peer` record.              |
| `netflow.engine_type`           | `uint64`   | NetFlow v5           | The flow-switching engine type.               |
| `netflow.engine_id`             | `uint64`   | NetFlow v5           | The flow-switching engine ID.                 |
| `netflow.sampling_mode`         | `uint64`   | NetFlow v5           | The sampling mode from the message header.    |
| `netflow.sampling_interval`     | `uint64`   | NetFlow v5           | The configured sampling interval.             |

NetFlow v5 events expose these fixed top-level fields:

| Field                            | Type     | Description                                   |
| -------------------------------- | -------- | --------------------------------------------- |
| `source_ipv4_address`            | `ip`     | Source IPv4 address.                          |
| `destination_ipv4_address`       | `ip`     | Destination IPv4 address.                     |
| `ip_next_hop_ipv4_address`       | `ip`     | IPv4 address of the next-hop router.          |
| `ingress_interface`              | `uint64` | Input interface index.                        |
| `egress_interface`               | `uint64` | Output interface index.                       |
| `packet_delta_count`             | `uint64` | Packets in the flow.                          |
| `octet_delta_count`              | `uint64` | Bytes in the flow.                            |
| `flow_start`                     | `time`   | Absolute flow start time derived from uptime. |
| `flow_end`                       | `time`   | Absolute flow end time derived from uptime.   |
| `source_transport_port`          | `uint64` | Source TCP or UDP port.                       |
| `destination_transport_port`     | `uint64` | Destination TCP or UDP port.                  |
| `protocol_identifier`            | `uint64` | IP protocol number.                           |
| `tcp_control_bits`               | `uint64` | TCP control flags.                            |
| `ip_class_of_service`            | `uint64` | IPv4 type-of-service byte.                    |
| `bgp_source_as_number`           | `uint64` | Source BGP autonomous system number.          |
| `bgp_destination_as_number`      | `uint64` | Destination BGP autonomous system number.     |
| `source_ipv4_prefix_length`      | `uint64` | Source address prefix length.                 |
| `destination_ipv4_prefix_length` | `uint64` | Destination address prefix length.            |

## Examples

The following examples cover capture files, live UDP collection, saved-message replay, and options records.

### Read a mixed capture file

You can parse a file that contains consecutive NetFlow and IPFIX messages:

```tql
from_file "flows.fnf" {
  read_netflow
}
```

### Receive NetFlow and IPFIX over UDP

Set `binary=true` so that [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md) preserves the datagram bytes:

```tql
accept_udp "0.0.0.0:2055", binary=true
read_netflow
```

Malformed or unsupported UDP datagrams produce warnings and are dropped. The operator continues with later datagrams because UDP preserves message boundaries. A malformed raw byte stream produces an error because the operator can’t safely find the next message boundary.

### Replay a saved message with peer metadata

Wrap a saved message in an event. If you know the original exporter endpoint, add it as a `peer` record:

```tql
from {
  data: file_contents("/var/log/netflow/exporter-1.ipfix", binary=true),
  peer: {
    ip: 192.0.2.1,
    port: 4739,
  },
}
read_netflow
```

Each event must contain one complete message. The `peer` record is optional. If you omit it, the operator assigns the message to an implicit exporter. If you include it, the operator copies it to the output and uses it for exporter-specific template state, just as it does for events from [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md).

### Select options records

NetFlow v9 and IPFIX options data uses the same protocol schema and carries an `options` record type:

```tql
from_file "flows.ipfix" {
  read_netflow
}
where netflow.record_type == "options"
```

## See Also

* [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md)
* [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md)
* [NetFlow](../../integrations/netflow.md)
