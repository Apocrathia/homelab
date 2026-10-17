---
title: "IBM QRadar integration"
description: "Send security events to IBM Security QRadar for SIEM analytics and incident investigation."
canonical: https://tenzir.com/integrations/qradar
source: https://tenzir.com/integrations/qradar.md
section: "Integrations"
---

# IBM QRadar integration

> Send security events to IBM Security QRadar for SIEM analytics and incident investigation.

[IBM QRadar SIEM](https://www.ibm.com/products/qradar-siem) is a security information and event management platform. Tenzir can send events to QRadar as Log Event Extended Format (LEEF) over Syslog, write LEEF files for batch import, receive QRadar-compatible LEEF streams, and query QRadar APIs for targeted backfill.

QRadar also supports proprietary collection and appliance workflows. Tenzir does not provide a dedicated QRadar operator. Prefer LEEF over TLS Syslog when QRadar should ingest live events from Tenzir.

IBM QRadar integration paths

## Choose an integration path

Use the path that matches where QRadar sits in your deployment:

| Goal                                     | QRadar side                                      | Tenzir operators and functions                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send live events to QRadar               | Universal LEEF Syslog log source over TLS Syslog | [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md), [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md), [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md) |
| Send live events without TLS             | Universal LEEF Syslog log source over TCP        | [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md), [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md), [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md) |
| Send one event per UDP datagram          | Universal LEEF Syslog log source over UDP        | [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md), [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md)                                                                                |
| Hand off historical or offline batches   | Log File Protocol polling a transfer location    | [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md), [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md), [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md) |
| Receive QRadar-compatible LEEF in Tenzir | Raw line-based LEEF sender                       | [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md), [`read_leef`](https://tenzir.com/docs/reference/operators/read_leef.md)                                                                          |
| Query stored QRadar events               | QRadar Ariel REST API                            | [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md), [`read_json`](https://tenzir.com/docs/reference/operators/read_json.md)                                                                            |

See the IBM documentation for the [LEEF overview](https://www.ibm.com/docs/en/dsm?topic=leef-overview), [LEEF event components](https://www.ibm.com/docs/en/dsm?topic=overview-leef-event-components), [Universal LEEF Syslog log source parameters](https://www.ibm.com/docs/en/dsm?topic=leef-syslog-protocol-log-source-parameters-universal), [TLS Syslog protocol configuration](https://www.ibm.com/docs/en/dsm?topic=options-tls-syslog-protocol-configuration), and [log source setup](https://www.ibm.com/docs/en/dsm?topic=management-adding-log-source).

## LEEF mapping

LEEF has fixed header fields and a small set of predefined event attributes. For agent-assisted work, follow [Use agent skills](../guides/ai-workbench/use-agent-skills.md#use-the-leef-skill) to install the `tenzir-leef` skill. The skill helps choose LEEF 1.0 or 2.0, pick delimiters, use predefined attributes such as `src`, `dst`, `srcPort`, `dstPort`, `usrName`, `sev`, and `msg`, and format `devTime` and `devTimeFormat` values before you build messages with [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md).

## Send events to QRadar over Syslog

QRadar can parse LEEF messages that arrive through a Universal LEEF Syslog log source. Build the LEEF payload with [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md), put it into the Syslog message body, and send the result with [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md) and [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md).

```tql
subscribe "detections"
leef = {
  src: src_ip?,
  dst: dest_ip?,
  srcPort: src_port?,
  dstPort: dest_port?,
  usrName: user_name?,
  sev: severity? else 5,
  cat: category? else "detection",
  msg: message? else event_name? else "Tenzir event",
}.print_leef(
  vendor="Tenzir",
  product_name="Tenzir Pipeline",
  product_version="6",
  event_class_id=event_type? else "tenzir.event",
  delimiter="^",
)
this = {
  facility: 4,
  severity: 6,
  hostname: "tenzir-node",
  app_name: "tenzir",
  message: leef,
}
to_tcp "qradar.example.com:514" {
  write_syslog
}
```

Replace `qradar.example.com:514` with the host and port of the QRadar event collector or gateway. Adapt the LEEF attributes to the source schema that you forward. Use IBM’s predefined LEEF attribute names where they fit, and use custom attribute names for fields that do not have a predefined QRadar equivalent.

Prefer TCP over UDP when you need connection-level delivery feedback or backpressure.

## Send events with TLS Syslog

IBM documents `6514` as the default port for TLS Syslog. Configure QRadar’s TLS Syslog protocol with the certificates and client authentication policy for your deployment, then enable TLS on [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md):

```tql
let $tls = {
  cacert: "/etc/tenzir/qradar-ca.pem",
  certfile: "/etc/tenzir/tenzir-client.pem",
  keyfile: "/etc/tenzir/tenzir-client-key.pem",
}


subscribe "detections"
leef = {
  src: src_ip?,
  dst: dest_ip?,
  srcPort: src_port?,
  dstPort: dest_port?,
  usrName: user_name?,
  sev: severity? else 5,
  cat: category? else "detection",
  msg: message? else event_name? else "Tenzir event",
}.print_leef(
  vendor="Tenzir",
  product_name="Tenzir Pipeline",
  product_version="6",
  event_class_id=event_type? else "tenzir.event",
  delimiter="^",
)
this = {
  facility: 4,
  severity: 6,
  hostname: "tenzir-node",
  app_name: "tenzir",
  message: leef,
}
to_tcp "qradar.example.com:6514", tls=$tls {
  write_syslog
}
```

If QRadar does not require client certificates, omit `certfile` and `keyfile`. Keep `cacert` when the QRadar certificate is signed by a private CA.

## Export LEEF files for backfill

Use file export for historical backfill, replay, or offline transfer when QRadar cannot receive live Syslog from Tenzir but can poll a directory or remote transfer location with the Log File Protocol. For live event streams, prefer TLS Syslog.

[`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md) returns a string, so select the LEEF field and write one line per event:

```tql
subscribe "detections"
leef = {
  src: src_ip?,
  dst: dest_ip?,
  srcPort: src_port?,
  dstPort: dest_port?,
  sev: severity? else 5,
  msg: message? else event_name? else "Tenzir event",
}.print_leef(
  vendor="Tenzir",
  product_name="Tenzir Pipeline",
  product_version="6",
  event_class_id=event_type? else "tenzir.event",
  delimiter="^",
)
to_file "/var/spool/qradar/tenzir-{uuid}.leef", timeout=1min {
  select leef
  write_lines
}
```

Use a rotation condition such as `timeout` or `max_size` to produce bounded handoff files. Match the directory path, polling interval, and file naming pattern to the QRadar Log File Protocol configuration.

## Receive LEEF in Tenzir

Use Tenzir as a LEEF receiver when a QRadar-compatible sender forwards raw line-based LEEF over TCP. This path expects each event to be a LEEF message, not a Syslog envelope.

```tql
accept_tcp "0.0.0.0:1514" {
  read_leef
}
publish "qradar"
```

Use TLS options on [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) if the sender expects TLS, while keeping the payload format as raw line-based LEEF.

## Query QRadar events

Use the QRadar Ariel REST API for scheduled backfill, investigations, or targeted enrichment. Do not use API polling as the primary live integration path when QRadar can forward or receive events through Syslog.

The QRadar API uses an authorized service token in the `SEC` header. The following example starts an Ariel search. Poll the returned search ID and fetch the results with the matching API endpoints for your QRadar version:

```tql
let $qradar = "https://qradar.example.com"
let $query = "SELECT * FROM events LAST 5 MINUTES"
let $headers = {
  "Accept": "application/json",
  "SEC": secret("QRADAR_API_TOKEN"),
  "Version": "20.0",
}
let $url = f"{$qradar}/api/ariel/searches?query_expression={$query.encode_url()}"


from_http $url, method="post", headers=$headers {
  read_json
}
```

Use QRadar’s interactive API documentation to verify the API version, endpoint parameters, and result pagination behavior in your deployment.

## See Also

* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`read_json`](https://tenzir.com/docs/reference/operators/read_json.md)
* [`read_leef`](https://tenzir.com/docs/reference/operators/read_leef.md)
* [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md)
* [`write_lines`](https://tenzir.com/docs/reference/operators/write_lines.md)
* [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md)
* [`encode_url`](https://tenzir.com/docs/reference/functions/encode_url.md)
* [`print_leef`](https://tenzir.com/docs/reference/functions/print_leef.md)
* [Use agent skills](../guides/ai-workbench/use-agent-skills.md#use-the-leef-skill)
* [File](file.md)
* [HTTP](http.md)
* [Syslog](syslog.md)
* [TCP](tcp.md)
* [UDP](udp.md)
