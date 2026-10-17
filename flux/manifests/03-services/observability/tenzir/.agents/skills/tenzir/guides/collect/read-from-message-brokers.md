---
title: "Read from message brokers"
canonical: https://tenzir.com/docs/guides/collect/read-from-message-brokers
source: https://tenzir.com/docs/guides/collect/read-from-message-brokers.md
section: "Docs"
---

# Read from message brokers

> This guide shows you how to receive events from message brokers using TQL. You’ll learn to subscribe to topics and queues from Apache Kafka (including Amazon MSK), Amazon Kinesis Data Streams, NATS JetStream, AMQP-based brokers (like RabbitMQ), Amazon SQS, and Google Cloud Pub/Sub.

This guide shows you how to receive events from message brokers using TQL. You’ll learn to subscribe to topics and queues from Apache Kafka (including Amazon MSK), Amazon Kinesis Data Streams, NATS JetStream, AMQP-based brokers (like RabbitMQ), Amazon SQS, and Google Cloud Pub/Sub.

## Apache Kafka

[Apache Kafka](../../integrations/kafka.md) is a distributed message broker commonly used for high-throughput event streaming. Use `from_kafka` to subscribe to topics.

### Subscribe to a topic

```tql
from_kafka "security-events"
```

By default, `from_kafka` produces events with the raw message in a `message` field. Parse the message content to extract structured data:

```tql
from_kafka "security-events"
this = message.parse_json()
```

### Decode Avro messages

For messages produced with a Confluent-compatible Schema Registry serializer, set `schema_registry` to decode Avro values directly into events:

```tql
from_kafka "security-events",
  schema_registry="https://registry.example.com"
```

The operator fetches the writer schema identified by each message. Configure `schema_registry_headers` and `schema_registry_tls` for registry authentication and TLS; the [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md) reference describes these options.

When each message contains a bare Avro datum without registry framing, decode the `message` string with [`parse_avro`](https://tenzir.com/docs/reference/functions/parse_avro.md) and the writer schema. Its reference includes a complete example.

Our [Apache Avro](../../integrations/avro.md) integration explains the difference between binary datums and Avro Object Container Files and how to decode each format.

### Control the read offset

The `offset` option determines where to start reading:

| Value         | Description                             |
| ------------- | --------------------------------------- |
| `"beginning"` | Start from the oldest available message |
| `"end"`       | Start from the newest messages only     |
| `"stored"`    | Resume from the last committed offset   |
| `1000`        | Start from a specific offset            |
| `-100`        | Start 100 messages before the end       |

```tql
from_kafka "events", offset="beginning"
```

### Configure consumer groups

Kafka uses consumer groups to distribute messages across multiple consumers. Specify a group ID for coordinated consumption:

```tql
from_kafka "events", group_id="tenzir-ingest"
```

### Connect to Amazon MSK

[Amazon MSK](../../integrations/amazon/msk.md) is a managed Kafka service. Use the `aws_iam` option for IAM authentication:

```tql
from_kafka "security-logs",
  options={"bootstrap.servers": "my-cluster.kafka.us-east-1.amazonaws.com:9098"},
  aws_iam={region: "us-east-1"}
```

## Amazon Kinesis

[Amazon Kinesis Data Streams](../../integrations/amazon/kinesis.md) is a managed streaming service on AWS. Use `from_amazon_kinesis` to receive records from a stream.

### Receive from a stream

```tql
from_amazon_kinesis "security-events", start="trim_horizon"
this = string(message).parse_json()
```

The operator emits one event per Kinesis record. The raw payload is stored in the `message` field as a `blob`, together with stream, shard, sequence number, partition key, and lag metadata.

## NATS JetStream

[NATS](../../integrations/nats.md) is a messaging system for services, edge deployments, and cloud-native applications. Use `from_nats` to consume messages from JetStream subjects.

### Consume from a subject

```tql
from_nats "alerts", durable="tenzir-alerts"
this = string(message).parse_json()
```

The NATS server must have a JetStream stream that captures the subject you consume from.

### Preserve message metadata

Use `metadata_field` to copy NATS metadata into events:

```tql
from_nats "alerts", metadata_field=nats
parsed = string(message).parse_json()
nats_subject = nats.subject
nats_stream = nats.stream
nats_sequence = nats.stream_sequence
```

## AMQP (RabbitMQ)

[AMQP](../../integrations/amqp.md) is supported by brokers such as RabbitMQ. Use `from_amqp` directly with AMQP URLs.

### Receive from a queue

```tql
from_amqp "amqp://user:pass@broker:5672/vhost", queue="events"
this = string(message).parse_json()
```

The URL structure is `amqp://user:password@host:port/vhost`. Configure additional options like `exchange`, `routing_key`, and `queue` in the operator parameters. The operator emits each AMQP payload in the `message` field.

## Amazon SQS

[Amazon SQS](../../integrations/amazon/sqs.md) is a managed message queue. Use `from_amazon_sqs` to receive events from SQS queues.

### Receive from a queue

```tql
from_amazon_sqs "sqs://my-queue"
this = message.parse_json()
```

### Configure polling

Use long polling to reduce empty responses, and set `batch_size` to control the maximum number of messages per receive request:

```tql
from_amazon_sqs "sqs://my-queue", poll_time=5s, batch_size=10
```

By default, Tenzir deletes each SQS message after emitting it. Set `keep_messages=true` to leave messages in the queue so SQS makes them visible again after the queue’s visibility timeout:

```tql
from_amazon_sqs "sqs://my-queue", keep_messages=true, visibility_timeout=30s
```

## Google Cloud Pub/Sub

[Google Cloud Pub/Sub](../../integrations/google/cloud-pubsub.md) provides managed messaging for Google Cloud. Use `from_google_cloud_pubsub` to subscribe.

### Receive from a subscription

```tql
from_google_cloud_pubsub project_id="my-project",
  subscription_id="my-subscription"
parsed = message.parse_json()
```

The operator produces events with a `message` field containing the raw message content. Parse it to extract structured data.

## Fetch data referenced in messages

A broker message may contain a reference to data stored elsewhere instead of carrying the data itself. After parsing the message, use [`each`](https://tenzir.com/docs/reference/operators/each.md) to start a source subpipeline that fetches the referenced data.

See [Collect](../collect.md#fetch-data-referenced-in-events) for the general collection pattern.

## See also

* [Parse string fields](../parse/parse-string-fields.md)
* [Apache Avro](../../integrations/avro.md)
* [Kafka](../../integrations/kafka.md)
* [NATS](../../integrations/nats.md)
* [AMQP](../../integrations/amqp.md)
* [Amazon Kinesis](../../integrations/amazon/kinesis.md)
* [Amazon SQS](../../integrations/amazon/sqs.md)
* [Google Cloud Pub/Sub](../../integrations/google/cloud-pubsub.md)
