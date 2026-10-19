---
title: "Graylog integration"
description: "Collect, index, and analyze log data for monitoring and troubleshooting."
canonical: https://tenzir.com/integrations/graylog
source: https://tenzir.com/integrations/graylog.md
section: "Integrations"
---

# Graylog integration

> Collect, index, and analyze log data for monitoring and troubleshooting.

[Graylog](https://graylog.org/) is a log management and SIEM platform that routes messages through inputs, streams, processing pipelines, index sets, destinations, and outputs. Tenzir can receive GELF streams from Graylog, send GELF into Graylog inputs, and access the OpenSearch or Elasticsearch search backend when you need backend-level queries.

Graylog message flow

## Choose an integration path

Use GELF when Graylog should ingest, route, index, and alert on the events. Use direct backend access only when you intentionally want to bypass Graylog’s ingestion path.

| Goal                 | Graylog side                                                                                                            | Tenzir path                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receive messages     | [GELF output](https://go2docs.graylog.org/current/interacting_with_your_log_data/gelf_outputs.htm) attached to a stream | [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) + [`read_gelf`](https://tenzir.com/docs/reference/operators/read_gelf.md)                                                                                     |
| Receive over TLS     | GELF output with protocol `TCP+TLS`                                                                                     | [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) with `tls` + [`read_gelf`](https://tenzir.com/docs/reference/operators/read_gelf.md)                                                                          |
| Send over TCP or TLS | [GELF TCP input](https://go2docs.graylog.org/current/getting_in_log_data/gelf.html)                                     | [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md) + [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md) + [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md) |
| Send over UDP        | GELF UDP input                                                                                                          | [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md) + [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md)                                                                                       |
| Send HTTP batches    | GELF HTTP input                                                                                                         | [`every`](https://tenzir.com/docs/reference/operators/every.md) + [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md) + [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md)                   |
| Query stored events  | OpenSearch or Elasticsearch search backend                                                                              | [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)                                                                                                                                                                 |
| Write backend data   | OpenSearch or Elasticsearch search backend                                                                              | [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) or [`to_elasticsearch`](https://tenzir.com/docs/reference/operators/to_elasticsearch.md)                                                                |

## GELF message format

GELF is a JSON message format with transport-specific framing. A [GELF message](https://go2docs.graylog.org/current/getting_in_log_data/gelf_format.html) must include `version`, `host`, and `short_message`. The `timestamp` field, when present, is a Unix timestamp in seconds. Custom fields must start with `_`.

TQL can build the GELF record directly:

```tql
gelf_timestamp = (timestamp? else now()).since_epoch().count_seconds()
this = {
  version: "1.1",
  host: source_host? else host? else "tenzir-node",
  short_message: message? else event_name? else "Tenzir event",
  timestamp: gelf_timestamp,
  level: syslog_level? else 6,
  _tenzir_topic: "detections",
}
```

Use [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md) to serialize the record as compact JSON. For transport framing, use [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md) when a transport requires a delimiter after each message.

## Receive messages from Graylog

Use a Graylog GELF output when you want Graylog to forward messages from one or more streams to a Tenzir pipeline.

Caution

Graylog documents that the classic GELF output does not use the Enterprise Output Framework. If the configured receiver is unavailable, messages can build up in the Graylog output buffer and block writes to the indexer. Keep the Tenzir listener available, or use a journaled Enterprise output with the GELF outbound payload format when that option is available in your Graylog deployment.

### Configure the Graylog output

1. In Graylog, go to **System > Outputs**.
2. Select **GELF Output** as the output type.
3. Configure the output host and port to point at the Tenzir node.
4. Select `TCP` as the protocol. Use `TCP+TLS` if the Tenzir listener requires TLS.
5. Save the output.
6. In **Streams**, attach the output to the stream that should forward messages to Tenzir.

The output sends messages only after you attach it to a stream.

### Start the Tenzir receiver

Deploy a pipeline that listens on the host and port configured in the Graylog output. This example accepts GELF over TCP on all interfaces and publishes the parsed events to the `graylog` topic:

```tql
accept_tcp "0.0.0.0:12201" {
  read_gelf
}
publish "graylog"
```

If you selected `TCP+TLS` in Graylog, configure TLS on the Tenzir listener:

```tql
let $tls = {
  certfile: "server.pem",
  keyfile: "server-key.pem",
}


accept_tcp "0.0.0.0:12201", tls=$tls {
  read_gelf
}
publish "graylog"
```

Replace the certificate paths with files that match the trust configuration of your Graylog output.

## Send events to Graylog

Use a Graylog GELF input when Graylog should index, search, alert on, or route events produced by a Tenzir pipeline.

1. In Graylog, go to **System > Inputs**.
2. Select a GELF input type, such as **GELF TCP**, **GELF UDP**, or **GELF HTTP**.
3. Configure the bind address and port. The default GELF port is `12201`.
4. For GELF TCP, enable null-frame delimiting if your Graylog input exposes that option. If you keep newline delimiting, use `"\n"` instead of `"\x00"` in the TCP examples below.
5. Start the input.

### Send GELF over TCP

Graylog GELF over TCP expects one compact GELF JSON object followed by a null byte. Build the GELF record in TQL, serialize it with [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md), and use [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md) to append the null-byte frame delimiter.

```tql
subscribe "detections"
gelf_timestamp = (timestamp? else now()).since_epoch().count_seconds()
this = {
  version: "1.1",
  host: source_host? else host? else "tenzir-node",
  short_message: message? else event_name? else "Tenzir event",
  timestamp: gelf_timestamp,
  level: syslog_level? else 6,
  _tenzir_topic: "detections",
}
to_tcp "graylog.example.com:12201" {
  write_delimited this.print_ndjson(strip_null_fields=true), "\x00"
}
```

Replace `graylog.example.com` with the Graylog node or load balancer that hosts the GELF TCP input.

If the Graylog input expects TLS, add TLS options to [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md):

```tql
to_tcp "graylog.example.com:12201", tls={} {
  write_delimited this.print_ndjson(strip_null_fields=true), "\x00"
}
```

### Send GELF over UDP

Graylog GELF over UDP expects one GELF message per datagram. Use [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md) when each serialized event fits into one datagram:

```tql
subscribe "detections"
gelf_timestamp = (timestamp? else now()).since_epoch().count_seconds()
this = {
  version: "1.1",
  host: source_host? else host? else "tenzir-node",
  short_message: message? else event_name? else "Tenzir event",
  timestamp: gelf_timestamp,
  level: syslog_level? else 6,
  _tenzir_topic: "detections",
}
to_udp "graylog.example.com:12201",
  message=this.print_ndjson(strip_null_fields=true)
```

Prefer TCP for reliable delivery. Use UDP only when datagram loss is acceptable and messages remain small enough for your network and Graylog input limits.

### Send GELF over HTTP

The GELF HTTP input accepts one JSON message per request, or newline-delimited JSON when you enable bulk receiving on the Graylog input.

For one HTTP request per event, wrap [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md) in [`each`](https://tenzir.com/docs/reference/operators/each.md):

```tql
let $headers = {"Content-Type": "application/json"}


subscribe "detections"
gelf_timestamp = (timestamp? else now()).since_epoch().count_seconds()
this = {
  version: "1.1",
  host: source_host? else host? else "tenzir-node",
  short_message: message? else event_name? else "Tenzir event",
  timestamp: gelf_timestamp,
  level: syslog_level? else 6,
  _tenzir_topic: "detections",
}
each {
  from $this
  to_http "http://graylog.example.com:12201/gelf", headers=$headers {
    write_json strip_null_fields=true
  }
}
```

For bulk receiving, group events into time-based batches with [`every`](https://tenzir.com/docs/reference/operators/every.md) and send newline-delimited GELF JSON:

```tql
let $headers = {"Content-Type": "application/json"}


subscribe "detections"
gelf_timestamp = (timestamp? else now()).since_epoch().count_seconds()
this = {
  version: "1.1",
  host: source_host? else host? else "tenzir-node",
  short_message: message? else event_name? else "Tenzir event",
  timestamp: gelf_timestamp,
  level: syslog_level? else 6,
  _tenzir_topic: "detections",
}
every 30s {
  to_http "http://graylog.example.com:12201/gelf", headers=$headers {
    write_ndjson strip_null_fields=true
  }
}
```

Use `https://` and configure TLS options on [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md) when the input expects TLS.

## Work with the search backend

Graylog stores searchable messages in index sets backed by OpenSearch or Elasticsearch. You can query those indices with [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md) when you need backfill, historical enrichment, or ad hoc exports.

Use direct writes with [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) or [`to_elasticsearch`](https://tenzir.com/docs/reference/operators/to_elasticsearch.md) only for custom indices that you manage outside Graylog’s ingestion path. Direct writes don’t pass through Graylog inputs, stream routing, processing pipelines, or destination rules.

## See Also

* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [`each`](https://tenzir.com/docs/reference/operators/each.md)
* [`every`](https://tenzir.com/docs/reference/operators/every.md)
* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`read_gelf`](https://tenzir.com/docs/reference/operators/read_gelf.md)
* [`to_elasticsearch`](https://tenzir.com/docs/reference/operators/to_elasticsearch.md)
* [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md)
* [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md)
* [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md)
* [`write_json`](https://tenzir.com/docs/reference/operators/write_json.md)
* [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md)
* [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md)
* [Elasticsearch](elasticsearch.md)
* [OpenSearch](opensearch.md)
* [TCP](tcp.md)
* [UDP](udp.md)
