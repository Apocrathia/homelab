---
title: "Send to destinations"
canonical: https://tenzir.com/docs/guides/route/send-to-destinations
source: https://tenzir.com/docs/guides/route/send-to-destinations.md
section: "Docs"
---

# Send to destinations

> This guide shows you how to send data to various destinations using TQL output operators. You’ll learn about message destinations, data stores, file output patterns, and expression-based serialization.

This guide shows you how to send data to various destinations using TQL output operators. You’ll learn about message destinations, data stores, file output patterns, and expression-based serialization.

## Destination operators

TQL provides `to_*` operators for sending events to various destinations. Message-oriented operators accept expressions for flexible serialization, while data store operators write structured rows directly.

### Message brokers

Send events to message brokers like [Kafka](../../integrations/kafka.md), [Amazon Kinesis Data Streams](../../integrations/amazon/kinesis.md), and [NATS](../../integrations/nats.md).

Send to Kafka with [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md) and automatic JSON formatting:

```tql
from {time: 2026-01-01T00:00:00Z, message: "login succeeded"}
to_kafka "events"
```

Specify explicit serialization with [`print_json`](https://tenzir.com/docs/reference/functions/print_json.md) in the `message` parameter:

```tql
from {time: 2026-01-01T00:00:00Z, message: "login succeeded"}
to_kafka "events", message=this.print_json()
```

The `message` parameter accepts any expression that evaluates to a string or blob.

Send to NATS JetStream with [`to_nats`](https://tenzir.com/docs/reference/operators/to_nats.md):

```tql
from {severity: "high", message: "credential access detected"}
to_nats "alerts"
```

The NATS server must have a JetStream stream that captures the destination subject.

Send to Kinesis with [`to_amazon_kinesis`](https://tenzir.com/docs/reference/operators/to_amazon_kinesis.md) and the default NDJSON serialization:

```tql
from {time: 2026-01-01T00:00:00Z, message: "endpoint connected"}
to_amazon_kinesis "security-events"
```

### Data stores

Send events to data stores like [ClickHouse](../../integrations/clickhouse.md), [DuckDB](../../integrations/duckdb.md), [Hydrolix](../../integrations/hydrolix.md), [Apache Iceberg](../../integrations/iceberg.md), and [Snowflake](../../integrations/snowflake.md).

Send structured events to ClickHouse with [`to_clickhouse`](https://tenzir.com/docs/reference/operators/to_clickhouse.md):

```tql
from {time: 2026-01-01T00:00:00Z, severity: "high", message: "scan detected"}
to_clickhouse table="alerts", primary=time, mode="create_append", tls=false
```

Write events into a local DuckDB database file with [`to_duckdb`](https://tenzir.com/docs/reference/operators/to_duckdb.md), which embeds DuckDB and needs no server:

```tql
from {time: 2026-01-01T00:00:00Z, severity: "high", message: "scan detected"}
to_duckdb "alerts.duckdb", table="alerts"
```

Stream events into a Hydrolix table with [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md). Because the example omits `transform`, the table needs a default transform that maps the events to its columns. Otherwise, name the transform with `transform`:

```tql
from {time: 2026-01-01T00:00:00Z, severity: "high", message: "scan detected"}
to_hydrolix "https://acme.hydrolix.live",
  token=secret("HYDROLIX_TOKEN"),
  table="security.alerts"
```

Write to an Apache Iceberg lakehouse table through a REST catalog with [`to_iceberg`](https://tenzir.com/docs/reference/operators/to_iceberg.md):

```tql
from {time: 2026-01-01T00:00:00Z, severity: "high", message: "scan detected"}
to_iceberg "security.events",
  catalog="https://catalog.example.com",
  partition_by=[day(time)]
```

Write batches to Snowflake with [`to_snowflake`](https://tenzir.com/docs/reference/operators/to_snowflake.md) and bulk ingestion:

```tql
from {time: 2026-01-01T00:00:00Z, severity: "high", message: "scan detected"}
to_snowflake \
  account_identifier="org-account",
  user_name="tenzir_user",
  password=secret("SNOWFLAKE_PASSWORD"),
  database="SECURITY",
  schema="PUBLIC",
  table="EVENTS"
```

These operators preserve event structure instead of requiring a `message` expression.

### Analytics platforms

Send data to platforms like [Splunk](../../integrations/splunk.md), [OpenSearch](../../integrations/opensearch.md), and [Elasticsearch](../../integrations/elasticsearch.md).

Send to a Splunk HEC endpoint with [`to_splunk`](https://tenzir.com/docs/reference/operators/to_splunk.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_splunk "https://splunk.example.com:8088",
  hec_token=secret("SPLUNK_HEC_TOKEN")
```

Send to OpenSearch with [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) and index routing:

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_opensearch "https://opensearch.example.com:9200",
  action="index",
  index="security-events"
```

### Cloud services

Route events to cloud destinations like [Amazon SQS](../../integrations/amazon/sqs.md) and [Google Cloud Pub/Sub](../../integrations/google/cloud-pubsub.md).

Send to SQS with [`to_amazon_sqs`](https://tenzir.com/docs/reference/operators/to_amazon_sqs.md):

```tql
from {severity: "high", message: "credential access detected"}
to_amazon_sqs "sqs://notifications", message=this.print_json()
```

Send to Pub/Sub with [`to_google_cloud_pubsub`](https://tenzir.com/docs/reference/operators/to_google_cloud_pubsub.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "endpoint connected"}
to_google_cloud_pubsub project_id="my-project",
  topic_id="events",
  message=this.print_json()
```

## File output

For writing to local files, use [`to_file`](https://tenzir.com/docs/reference/operators/to_file.md) with a printing subpipeline. This pattern separates serialization from storage.

Write JSON to a local file with [`write_json`](https://tenzir.com/docs/reference/operators/write_json.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_file "output.json" {
  write_json
}
```

Write Parquet with [`write_parquet`](https://tenzir.com/docs/reference/operators/write_parquet.md) and Zstandard compression:

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_file "archive.parquet" {
  write_parquet compression_type="zstd"
}
```

Our guide on [Write partitioned files](../store/write-partitioned-files.md) explains how to partition files and rotate them by size or time, including how buffering operators such as `sort` affect rotation.

Serialize events with [`write_ndjson`](https://tenzir.com/docs/reference/operators/write_ndjson.md) and write them to [Amazon S3](../../integrations/amazon/s3.md) with [`to_s3`](https://tenzir.com/docs/reference/operators/to_s3.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_s3 "s3://bucket/logs/events.jsonl" {
  write_ndjson
}
```

## Byte-stream output

Socket and protocol destinations accept a subpipeline that transforms events into a byte stream. This lets you choose the serialization and framing expected by the receiver.

Send NDJSON as the body of an HTTP request with [`to_http`](https://tenzir.com/docs/reference/operators/to_http.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_http "https://example.com/ingest" {
  write_ndjson
}
```

Send newline-delimited JSON over [TCP](../../integrations/tcp.md) with [`to_tcp`](https://tenzir.com/docs/reference/operators/to_tcp.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_tcp "collector.example.com:5044" {
  write_ndjson
}
```

For protocols that expect a delimiter after every message, print the event with [`print_ndjson`](https://tenzir.com/docs/reference/functions/print_ndjson.md) and use [`write_delimited`](https://tenzir.com/docs/reference/operators/write_delimited.md) for the byte-stream framing:

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_tcp "collector.example.com:12201" {
  write_delimited this.print_ndjson(strip_null_fields=true), "\x00"
}
```

Send NDJSON to a local Unix domain socket with [`to_unix_socket`](https://tenzir.com/docs/reference/operators/to_unix_socket.md):

```tql
from {time: 2026-01-01T00:00:00Z, message: "authentication failed"}
to_unix_socket "/run/collector.sock" {
  write_ndjson
}
```

## Expression-based serialization for message destinations

Message-oriented destination operators such as [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md) use expressions for flexible message formatting:

### Serialize the entire event

Use the default event serialization:

```tql
from {time: 2026-01-01T00:00:00Z, message: "login succeeded"}
to_kafka "events"
```

Serialize as compact JSON without nulls:

```tql
from {time: 2026-01-01T00:00:00Z, message: "login succeeded", error: null}
to_kafka "events", message=this.print_json(include_nulls=false)
```

### Serialize specific fields

Send only a specific field:

```tql
from {alert_message: "credential access detected"}
to_kafka "alerts", message=alert_message
```

Combine fields into a formatted string:

```tql
from {host: "sensor-1", metric_name: "events", value: 42}
to_kafka "metrics", message=f"{host}: {metric_name}={value}"
```

### Dynamic routing

Route events to different destinations based on content:

```tql
from {event_type: "authentication", message: "login succeeded"}
to_kafka f"events.{event_type}"
```

## See also

* [Fan out with subpipelines](fan-out-with-subpipelines.md)
* [Load-balance pipelines](load-balance-pipelines.md)
* [Split and merge streams](split-and-merge-streams.md)
* [Write partitioned files](../store/write-partitioned-files.md)
