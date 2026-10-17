---
title: "NetFlow integration"
description: "Collect and process NetFlow v5, NetFlow v9, and IPFIX flow telemetry."
canonical: https://tenzir.com/integrations/netflow
source: https://tenzir.com/integrations/netflow.md
section: "Integrations"
---

# NetFlow integration

> Collect and process NetFlow v5, NetFlow v9, and IPFIX flow telemetry.

NetFlow is a family of protocols for exporting summaries of network traffic. [IPFIX](https://datatracker.ietf.org/doc/html/rfc7011) standardizes a closely related format. Tenzir supports NetFlow v5, NetFlow v9, and IPFIX.

## Run a NetFlow collector

A Tenzir pipeline can receive NetFlow and IPFIX datagrams, resolve templates, and publish structured flow events for downstream pipelines:

netflow-collector.tql

```tql
accept_udp "0.0.0.0:2055", binary=true
read_netflow
publish "netflow"
```

Set `binary=true` so that [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md) preserves every UDP payload as a blob. [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md) detects the protocol version and includes the sender address in `netflow.exporter`.

Configure routers, switches, firewalls, or flow utilities to export to the node’s address and port. Downstream pipelines can use [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md) with the `netflow` topic to process, store, or forward the events independently.

Start the collector before sending data. NetFlow v9 and IPFIX data sets may depend on templates sent in earlier datagrams.

## Connect nfcapd

When `nfcapd` already receives the live export stream, use its packet repeater to send the same datagrams to the Tenzir collector:

```sh
nfcapd \
  -l /var/cache/nfdump \
  -p 2055 \
  -R tenzir.example.com/2055
```

Without `nfcapd -A`, Tenzir sees the `nfcapd` host as the UDP sender rather than the original exporter. This changes `netflow.exporter` and can make exporters with overlapping NetFlow v9 source IDs or IPFIX observation domain IDs ambiguous. Send directly to Tenzir when preserving exporter identity matters.

## Replay an nfcapd file

Files named `nfcapd.*` use the nfdump binary format, not the NetFlow or IPFIX wire format. You can’t pass them directly to [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md).

Keep the Tenzir collector running, then use `nfreplay` to send an archived file to its UDP socket:

```sh
nfreplay \
  -r /var/cache/nfdump/nfcapd.202608011200 \
  -H tenzir.example.com \
  -p 2055
```

`nfreplay` emits newly encoded NetFlow v9 datagrams by default. Tenzir therefore sees the replay host as the exporter, and message metadata reflects the replay rather than the original export packets.

For one-shot processing without UDP replay, convert an nfcapd file to NDJSON and pipe it into Tenzir:

```sh
nfdump -r /var/cache/nfdump/nfcapd.202608011200 -o ndjson \
  | tenzir 'read_ndjson'
```

This path bypasses [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md). Field names and value representations come from `nfdump`, so the events don’t use Tenzir’s `netflow.v5`, `netflow.v9`, or `netflow.ipfix` schemas.

## Process raw message files

When a file contains consecutive wire-format NetFlow or IPFIX messages, process it directly with [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md):

```tql
from_file "flows.ipfix" {
  read_netflow
}
```

The file must not contain packet capture headers or an nfdump container.

## See also

* [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md)
* [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md)
* [`publish`](https://tenzir.com/docs/reference/operators/publish.md)
* [`subscribe`](https://tenzir.com/docs/reference/operators/subscribe.md)
* [UDP](udp.md)
* [File](file.md)
