---
title: "ArcSight integration"
description: "OpenText ArcSight is a SIEM and log management ecosystem. Tenzir integrates with ArcSight through open interfaces such as CEF, Syslog, Kafka, and the ArcSight Logger REST API."
canonical: https://tenzir.com/integrations/arcsight
source: https://tenzir.com/integrations/arcsight.md
section: "Integrations"
---

# ArcSight integration

> OpenText ArcSight is a SIEM and log management ecosystem. Tenzir integrates with ArcSight through open interfaces such as CEF, Syslog, Kafka, and the ArcSight Logger REST API.

[OpenText ArcSight](https://www.opentext.com/products/arcsight-enterprise-security-manager) is a SIEM and log management ecosystem. Tenzir integrates with ArcSight through open interfaces such as CEF, Syslog, Kafka, and the ArcSight Logger REST API.

ArcSight integration paths

ArcSight products also have proprietary interfaces, including SmartMessage and ESM binary event transport. Tenzir does not provide dedicated operators for those protocols. Prefer CEF over Syslog, CEF over Kafka, or Logger REST search when you connect ArcSight and Tenzir.

## Choose an integration path

Use the interface that matches where ArcSight sits in your deployment:

| Goal                                                 | ArcSight interface              | Tenzir operators and functions                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Send events to Logger or a CEF Syslog SmartConnector | CEF or Syslog receiver over TCP | [`print_cef`](https://tenzir.com/docs/reference/functions/print_cef.md), [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md), [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)                                                                                                                                                         |
| Send CEF datagrams to Logger                         | CEF UDP receiver                | [`print_cef`](https://tenzir.com/docs/reference/functions/print_cef.md), [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md)                                                                                                                                                                                                                                        |
| Publish events to Transformation Hub                 | Kafka topic `th-cef`            | [`print_cef`](https://tenzir.com/docs/reference/functions/print_cef.md), [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)                                                                                                                                                                                                                                    |
| Receive forwarded ArcSight events                    | CEF or Syslog over TCP or UDP   | [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md), [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md), [`read_cef`](https://tenzir.com/docs/reference/operators/read_cef.md), [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md), [`parse_cef`](https://tenzir.com/docs/reference/functions/parse_cef.md) |
| Read from Transformation Hub                         | Kafka topic `th-cef`            | [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md), [`parse_cef`](https://tenzir.com/docs/reference/functions/parse_cef.md)                                                                                                                                                                                                                                |
| Query stored Logger events                           | Logger REST search service      | [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)                                                                                                                                                                                                                                                                                                           |

See the ArcSight documentation for [Logger receivers](https://www.microfocus.com/documentation/arcsight/logger-7.2.2/Logger-Admin-Guide/Content/Logger_AdminGuide/Configuration/Receivers.htm), [SmartConnector destinations](https://www.microfocus.com/documentation/arcsight/logger-7.2.2/Logger-Admin-Guide/Content/Logger_AdminGuide/Using_SmartConnectors_to_Collect_Events/Configuring_a_SmartConnector_to_Send_Events_to_Logger.htm), [CEF](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/cef-implementation-standard/Content/CEF/Chapter%201%20What%20is%20CEF.htm), [Transformation Hub Kafka topics](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/AS_smartconn_install/Content/Installinfo/smartconn_cef_kafka.htm), [Logger forwarding](https://www.microfocus.com/documentation/arcsight/logger-7.2.2/Logger-Admin-Guide/Content/Logger_AdminGuide/Overview/Forwarder_Configuration.htm), and [Logger REST search](https://www.microfocus.com/documentation/arcsight/logger-7.2.2/Logger-WebServices-API/Content/Logger_WebServicesAPI/RESTful_Search_Service/REST_SearchService.htm).

## Send events to ArcSight Logger

ArcSight Logger can receive events through receivers such as CEF TCP, CEF UDP, and SmartMessage. If you want ArcSight to parse Tenzir events as CEF, format the event with [`print_cef`](https://tenzir.com/docs/reference/functions/print_cef.md) first.

For a TCP receiver, wrap the CEF payload in Syslog and connect to the Logger or SmartConnector endpoint:

```tql
subscribe "detections"
cef = this.print_cef(
  cef_version="0",
  device_vendor="Tenzir",
  device_product="Tenzir",
  device_version="6",
  signature_id=event_type? else "tenzir.event",
  name=event_name? else "Tenzir event",
  severity=string(severity? else 5),
)
message = cef
facility = 4
severity = 6
hostname = "tenzir-node"
app_name = "tenzir"
to_tcp "arcsight-logger.example.com:515" {
  write_syslog
}
```

Replace `arcsight-logger.example.com:515` with the host and port of your Logger receiver or SmartConnector destination. Use TLS options on [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md) if the receiver expects TLS.

If you configured a CEF UDP receiver, send one CEF message per datagram:

```tql
subscribe "detections"
cef = this.print_cef(
  cef_version="0",
  device_vendor="Tenzir",
  device_product="Tenzir",
  device_version="6",
  signature_id=event_type? else "tenzir.event",
  name=event_name? else "Tenzir event",
  severity=string(severity? else 5),
)
to_udp "arcsight-logger.example.com:514", message=cef
```

Prefer TCP when you need delivery feedback, connection-level TLS, or receiver backpressure. UDP is useful only when your ArcSight receiver is explicitly configured for CEF datagrams.

## Publish CEF to Transformation Hub

ArcSight Transformation Hub is Kafka-based. SmartConnectors use the `th-cef` topic for CEF events, so Tenzir can publish CEF messages with [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md):

```tql
let $options = {
  "bootstrap.servers": "kafka1.example.com:9093,kafka2.example.com:9093",
  "security.protocol": "ssl",
  "ssl.ca.location": "/etc/tenzir/arcsight-th-ca.pem",
}


subscribe "detections"
cef = this.print_cef(
  cef_version="0",
  device_vendor="Tenzir",
  device_product="Tenzir",
  device_version="6",
  signature_id=event_type? else "tenzir.event",
  name=event_name? else "Tenzir event",
  severity=string(severity? else 5),
)
to_kafka "th-cef", message=cef, options=$options
```

Adapt the `options` record to match the Kafka settings of your Transformation Hub deployment. The Kafka operators pass these options to librdkafka.

## Receive ArcSight events in Tenzir

Use Tenzir as a CEF or Syslog receiver when a SmartConnector, Logger forwarder, or another ArcSight component sends events to a network destination.

For raw CEF over TCP, listen with [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) and parse the byte stream with [`read_cef`](https://tenzir.com/docs/reference/operators/read_cef.md):

```tql
accept_tcp "0.0.0.0:1514" {
  read_cef
}
publish "arcsight"
```

For Syslog-wrapped CEF over TCP, parse Syslog first, then parse the CEF payload from the Syslog message body:

```tql
accept_tcp "0.0.0.0:514" {
  read_syslog
}
cef_message = message? else content?
this = cef_message.parse_cef()
publish "arcsight"
```

For UDP forwarding, receive one datagram per event. The following example expects raw CEF datagrams:

```tql
accept_udp "0.0.0.0:1514"
this = data.parse_cef()
publish "arcsight"
```

## Read from Transformation Hub

Consume CEF messages from the `th-cef` topic with [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) and parse each Kafka message with [`parse_cef`](https://tenzir.com/docs/reference/functions/parse_cef.md):

```tql
let $options = {
  "bootstrap.servers": "kafka1.example.com:9093,kafka2.example.com:9093",
  "security.protocol": "ssl",
  "ssl.ca.location": "/etc/tenzir/arcsight-th-ca.pem",
}


from_kafka "th-cef", options=$options
this = message.parse_cef()
publish "arcsight"
```

ArcSight can also use an Avro topic for normalized events. Tenzir does not have a first-class ArcSight Avro parser, so use `th-cef` when you want to process Transformation Hub events with built-in Tenzir operators.

## Query ArcSight Logger

ArcSight Logger exposes a REST search service for stored events. The API is session-oriented: log in, create a search session, fetch results, close the search session, and log out. Use this path for scheduled backfill or targeted queries, not for live forwarding.

After you have a Logger user session and search session, use [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md) to fetch events:

```tql
let $logger = "https://logger.example.com:9000"
let $user_session = secret("ARCSIGHT_LOGGER_SESSION")
let $search_session = secret("ARCSIGHT_LOGGER_SEARCH_SESSION")
let $headers = {
  "Content-Type": "application/json; charset=UTF-8",
}
let $body = {
  user_session_id: $user_session,
  search_session_id: $search_session,
  fields: [
    "deviceEventClassId",
    "deviceVendor",
    "deviceReceiptTime",
    "sourceAddress",
    "destinationAddress",
  ],
}


from_http f"{$logger}/server/search/events", headers=$headers, body=$body {
  read_json
}
```

The response includes the Logger result metadata and event rows for the selected fields. Shape the returned fields in TQL after you select the fields in the Logger search query.

## See Also

* [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md)
* [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md)
* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md)
* [`read_cef`](https://tenzir.com/docs/reference/operators/read_cef.md)
* [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md)
* [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)
* [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md)
* [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md)
* [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md)
* [`parse_cef`](https://tenzir.com/docs/reference/functions/parse_cef.md)
* [`print_cef`](https://tenzir.com/docs/reference/functions/print_cef.md)
* [Kafka](kafka.md)
* [Syslog](syslog.md)
