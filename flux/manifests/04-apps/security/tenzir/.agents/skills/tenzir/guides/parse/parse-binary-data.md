---
title: "Parse binary data"
canonical: https://tenzir.com/docs/guides/parse/parse-binary-data
source: https://tenzir.com/docs/guides/parse/parse-binary-data.md
section: "Docs"
---

# Parse binary data

> This guide shows you how to parse binary data formats into structured events. You’ll learn to work with columnar formats like Parquet and Feather, network flow messages in NetFlow and IPFIX, packet captures in PCAP and PCAPNG formats, Tenzir’s native BITZ format, and compressed data.

This guide shows you how to parse binary data formats into structured events. You’ll learn to work with columnar formats like Parquet and Feather, network flow messages in NetFlow and IPFIX, packet captures in PCAP and PCAPNG formats, Tenzir’s native BITZ format, and compressed data.

The examples use [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md) with a [parsing subpipeline](../../reference/programs.md#parsing-subpipelines) to illustrate each technique.

## Parquet

[Apache Parquet](https://parquet.apache.org/) is a columnar format widely used in data lakes and analytics pipelines. Given this Parquet file containing user data:

```tql
from_file "users.parquet" {
  read_parquet
}
```

```tql
{id: 1, name: "alice", email: "alice@example.com", role: "admin"}
{id: 2, name: "bob", email: "bob@example.com", role: "user"}
{id: 3, name: "carol", email: "carol@example.com", role: "user"}
```

Parquet files often come from cloud storage:

```tql
from_file "s3://datalake/events/*.parquet"
```

The [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md) operator automatically detects Parquet format from the file extension.

## Feather

[Apache Feather](https://arrow.apache.org/docs/python/feather.html) is Parquet’s little brother - a lightweight columnar format optimized for fast I/O:

```tql
from_file "data.feather" {
  read_feather
}
```

Use [`read_feather`](https://tenzir.com/docs/reference/operators/read_feather.md) to parse Feather files.

## NetFlow and IPFIX

NetFlow v5, NetFlow v9, and IPFIX encode network flow summaries as binary wire messages. Use [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md) to parse a file containing consecutive raw messages:

```tql
from_file "flows.ipfix" {
  read_netflow
}
```

Specify [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md) explicitly. It detects the protocol version of every message and retains NetFlow v9 and IPFIX templates across messages.

The input must contain raw wire-format messages. [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md) does not parse PCAP headers or the nfdump container used by `nfcapd.*` files. For live collection and ways to process nfdump files, see the [NetFlow](../../integrations/netflow.md) integration.

## PCAP and PCAPNG

[PCAP](https://wiki.wireshark.org/Development/LibpcapFileFormat) and [PCAPNG](https://pcapng.com/) store captured network packets. PCAPNG extends the classic format with sections, multiple capture interfaces, and per-interface timestamp settings.

Use [`read_pcap`](https://tenzir.com/docs/reference/operators/read_pcap.md) for either format. The operator detects the format from the file header:

```tql
from_file "capture.pcapng" {
  read_pcap
}
```

```tql
{linktype: 1, timestamp: 2024-01-15T10:30:45.123456Z, captured_packet_length: 74, original_packet_length: 74, data: "ABY88f1tZJ7zvttmCABFAAA8..."}
```

Use [`from_nic`](https://tenzir.com/docs/reference/operators/from_nic.md) to parse directly from a live interface. TQL also includes lightweight packet processing functions. For example, you can extract protocol headers from raw packet data using the [`decapsulate`](https://tenzir.com/docs/reference/functions/decapsulate.md) function:

```tql
from_file "capture.pcapng" {
  read_pcap
}
packet = decapsulate(this)
```

```tql
{packet: {ether: {src: "64-9E-F3-BE-DB-66", dst: "00-16-3C-F1-FD-6D", type: 2048}, ip: {src: "192.168.1.100", dst: "10.0.0.1", type: 6}, tcp: {src_port: 54321, dst_port: 443}, community_id: "1:YXWfTYEyYLKVv5Ge4WqijUnKTrM="}}
```

Use [`write_pcap`](https://tenzir.com/docs/reference/operators/write_pcap.md) to produce packet capture files. It retains PCAPNG when you pass through events from [`read_pcap`](https://tenzir.com/docs/reference/operators/read_pcap.md). Set `format="pcapng"` to convert other packet events explicitly:

```tql
from_file "capture.pcap" {
  read_pcap
}
to_file "capture.pcapng" {
  write_pcap format="pcapng"
}
```

## BITZ

BITZ, short for **Bi**nary **T**en**z**ir, is Tenzir’s native columnar format, optimized for schema-rich security data. Use [`read_bitz`](https://tenzir.com/docs/reference/operators/read_bitz.md) to parse it. Use [`write_bitz`](https://tenzir.com/docs/reference/operators/write_bitz.md) to serialize events into the same format for later reuse:

```tql
from_file "archive.bitz" {
  read_bitz
}
```

## Compressed data

Binary formats often come compressed. The [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md) operator automatically detects compression based on file extensions like `.gz`, `.zst`, `.bz2`, `.lz4`, and `.br`:

```tql
from_file "data.parquet.gz"      // Auto-detects gzip
from_file "logs.json.zst"        // Auto-detects zstd
```

When automatic detection doesn’t apply (e.g., custom extensions or chained formats), use explicit decompression operators in the parsing subpipeline. These are bytes-to-bytes operators, so they must appear before the parser:

| Format    | Operator                                                                                |
| --------- | --------------------------------------------------------------------------------------- |
| Gzip      | [`decompress_gzip`](https://tenzir.com/docs/reference/operators/decompress_gzip.md)     |
| Zstandard | [`decompress_zstd`](https://tenzir.com/docs/reference/operators/decompress_zstd.md)     |
| Bzip2     | [`decompress_bz2`](https://tenzir.com/docs/reference/operators/decompress_bz2.md)       |
| LZ4       | [`decompress_lz4`](https://tenzir.com/docs/reference/operators/decompress_lz4.md)       |
| Brotli    | [`decompress_brotli`](https://tenzir.com/docs/reference/operators/decompress_brotli.md) |

Example with explicit decompression:

```tql
from_file "capture.pcap.zst" {
  decompress_zstd
  read_pcap
}
```

## See also

* [Parse delimited text](parse-delimited-text.md)
* [Get data from the network](../collect/get-data-from-the-network.md)
