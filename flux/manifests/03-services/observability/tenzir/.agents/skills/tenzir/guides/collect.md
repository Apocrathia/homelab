---
title: "Overview"
description: "Read events and bytes from files, APIs, brokers, stores, and networks."
canonical: https://tenzir.com/docs/guides/collect
source: https://tenzir.com/docs/guides/collect.md
section: "Docs"
---

# Overview

> Read events and bytes from files, APIs, brokers, stores, and networks.

This guide provides an overview of data collection in TQL. You’ll learn about the different approaches for ingesting data from various sources.

Collection is the first stage of the data lifecycle, and the only one that talks to a system outside your control. [Learn the data lifecycle](../tutorials/learn-the-data-lifecycle.md) shows what comes after it.

TQL provides two types of input operators:

* **`from_*` operators** like [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md) and

  [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md) read bytes and parse them using a [subpipeline](../reference/programs.md#parsing-subpipelines).

* **Direct event operators** like [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md), [`accept_otlp`](https://tenzir.com/docs/reference/operators/accept_otlp.md), and [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md) produce structured events directly without an intermediate byte stream.

## Collection patterns

Different data sources require different collection approaches.

### Files and cloud storage

Read local files, watch directories for changes, or access cloud storage:

```tql
// Single file with automatic format detection
from_file "/var/log/app.json"


// Watch a directory for new files
from_file "/incoming/*.csv", watch=10s


// Cloud storage with glob patterns
from_file "s3://bucket/data/**/*.parquet"
```

See the [file reading guide](collect/read-and-watch-files.md) for details.

### HTTP and APIs

Fetch data from web APIs with authentication, pagination, and retry handling:

```tql
from_http "https://api.example.com/events",
  headers={"Authorization": f"Bearer {secret("API_TOKEN")}"}
```

See the [HTTP and API guide](collect/fetch-via-http-and-apis.md) for pagination patterns and advanced configurations.

### Message brokers

Subscribe to topics or queues from Apache Kafka, NATS, AMQP, Amazon SQS, and Google Cloud Pub/Sub:

```tql
from_kafka "security-events", offset="end"
```

For NATS JetStream, consume from a subject and parse the message field:

```tql
from_nats "alerts"
this = string(message).parse_json()
```

See the [message broker guide](collect/read-from-message-brokers.md) for broker-specific configurations.

### Data stores

Query external data stores such as MySQL and ClickHouse:

```tql
from_clickhouse sql="SELECT * FROM events WHERE severity >= 3", tls=false
```

See the [data store guide](collect/read-from-data-stores.md) for table reads, SQL pushdown, metadata inspection, and live MySQL polling.

### Network data

Receive OpenTelemetry signals, listen on TCP or UDP sockets, collect NetFlow and IPFIX flow telemetry, or capture packets from network interfaces:

```tql
// OpenTelemetry logs, metrics, and traces over OTLP/HTTP or OTLP/gRPC
accept_otlp "0.0.0.0:4318"


// UDP syslog receiver
accept_udp "0.0.0.0:514"


// NetFlow v5, NetFlow v9, and IPFIX collector
accept_udp "0.0.0.0:2055", binary=true
read_netflow


// TCP with TLS
accept_tcp "0.0.0.0:8443", tls={} {
  read_json
}


// Raw packet capture
from_nic "eth0"
```

See the [network data guide](collect/get-data-from-the-network.md) for OTLP/HTTP ingestion, socket configuration, flow telemetry, and packet capture.

### Fetch data referenced in events

Some sources emit a reference to data instead of the data itself. Use [`each`](https://tenzir.com/docs/reference/operators/each.md) to start one source pipeline for every reference event.

For example, assume that each Amazon SQS message contains a JSON object with an `object_url` field:

```tql
from_amazon_sqs "sqs://object-notifications"
this = message.parse_json()
each {
  from_s3 $this.object_url {
    read_auto
  }
}
```

One subpipeline per reference event

[`each`](https://tenzir.com/docs/reference/operators/each.md) starts a fresh subpipeline for every reference event. The current reference is available as `$this`, so the source operator can use fields from the reference event. The fetched events flow back into one output stream.

Only accept references from trusted producers. A URL supplied by an untrusted event could direct the Tenzir Node to an internal or sensitive network location.

For an SQS-to-S3 example, see the [CrowdStrike](../integrations/crowdstrike.md) integration, which uses this pattern to collect Falcon Data Replicator events.

## Sending data to destinations

For routing data to outputs, see the [Routing guides](route/send-to-destinations.md), which cover destination operators, file output, load balancing, and pipeline connections.

## See also

* [Read and watch files](collect/read-and-watch-files.md)
* [Fetch via HTTP and APIs](collect/fetch-via-http-and-apis.md)
* [Read from message brokers](collect/read-from-message-brokers.md)
* [Read from data stores](collect/read-from-data-stores.md)
* [Get data from the network](collect/get-data-from-the-network.md)
* [Send to destinations](route/send-to-destinations.md)
