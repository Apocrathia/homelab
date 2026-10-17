---
title: "from_kafka"
canonical: https://tenzir.com/docs/reference/operators/from_kafka
source: https://tenzir.com/docs/reference/operators/from_kafka.md
section: "Docs"
---

# from_kafka

> Receives events from an Apache Kafka topic.

Receives events from an Apache Kafka topic.

```tql
from_kafka topic:string, [count=int, exit=bool, offset=int|string, options=record,
           aws_iam=record, aws_region=string, batch_size=int,
           schema_registry=string|secret, schema_registry_headers=record,
           schema_registry_tls=bool|record]
```

## Description

The `from_kafka` operator consumes messages from a Kafka topic and produces events containing the message payload as a string field. With `schema_registry`, it decodes Avro message values directly into structured events.

The implementation uses the official [librdkafka](https://github.com/confluentinc/librdkafka) from Confluent and supports all [configuration options](https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md). You can specify them via `options` parameter as `{key: value, ...}`.

The operator injects the following default librdkafka configuration values in case no configuration file is present, or when the configuration does not include them:

* `bootstrap.servers`: `localhost`
* `client.id`: `tenzir`
* `group.id`: `tenzir`
* `enable.auto.commit`: `false` (This option cannot be changed)

Without `schema_registry`, each consumed message is produced as an event with the following schema:

```tql
{
  message: string
}
```

### `topic: string`

The Kafka topic to consume from.

If the topic starts with `^`, `from_kafka` treats it as a regular expression and subscribes to all matching topics. The regular expression must match the complete topic name, so use patterns like `^tenant-.*\.alerts$`.

### `count = int (optional)`

Exit successfully after having consumed `count` messages.

### `exit = bool (optional)`

Exit successfully after having received the last message from all partitions. This option isn’t supported with regular expression topic subscriptions.

Without this option, the operator waits for new messages after consuming the last one.

### `offset = int|string (optional)`

The offset to start consuming from. Possible values are:

* `"beginning"`: first offset
* `"end"`: last offset
* `"stored"`: stored offset
* `<value>`: absolute offset
* `-<value>`: relative offset from end

The default is `"stored"`.

### `options = record (optional)`

A record of key-value configuration options for [librdkafka](https://github.com/confluentinc/librdkafka), e.g., `{"auto.offset.reset" : "earliest", "enable.partition.eof": true}`.

The `from_kafka` operator passes the key-value pairs directly to [librdkafka](https://github.com/confluentinc/librdkafka). Consult the list of available [configuration options](https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md) to configure Kafka according to your needs.

We recommend factoring these options into the plugin-specific `kafka.yaml` so that they are independent of the `from_kafka` arguments.

### `batch_size = int (optional)`

The number of messages to accumulate before emitting a batch. The operator commits offsets after each batch to improve throughput.

Defaults to `10k`.

### `schema_registry = string|secret (optional)`

The URL of a Confluent-compatible Schema Registry used to decode Avro message values.

The operator accepts version 0 schema IDs and version 1 schema GUIDs in either the payload prefix or the `__value_schema_id` Kafka header. It checks the last such header first and falls back to the payload prefix when the header is absent or null. A malformed, non-null header produces an error. With a non-null header, the message value contains the datum directly, without a schema identifier prefix.

The URL may include a base path, but must have a valid host and must not contain a query or fragment.

Schemas are fetched by the identifier in each message, including their named references, and cached for reuse. Messages may use different schema versions. The registry must return Avro schemas. Kafka keys are not decoded.

Avro records become events; other top-level Avro values are wrapped in a `value` field. Kafka tombstones produce no event, but count towards `count`. Empty, non-null payloads are decoded according to their schema. Each value must contain exactly one datum; trailing bytes produce an error. Top-level `bytes` values use the Confluent encoding, with no Avro length prefix.

Values use the type mapping of [`read_avro`](https://tenzir.com/docs/reference/operators/read_avro.md). Recursive schemas and arrays whose item schema does not have a fixed Tenzir type are unsupported. Each datum is limited to 16 MiB in encoded form and in the decoder’s estimated in-memory representation. Registry response bodies for one schema and its references are limited to 16 MiB in total. Cyclic references are unsupported; a lookup supports at most 128 named references and 32 schema levels, including the root schema.

Registry requests retry transient failures. An unrecoverable registry error, invalid schema, or malformed datum stops the pipeline without committing the failed batch or later messages. Restarting with the same consumer group can replay messages from that batch when using `offset="stored"`.

Avro batches are emitted and committed in fetch order, preserving message order within each partition. The consumer continues polling while registry requests are pending and while accepted batches drain. If its assignment changes while an Avro batch is in flight, the operator stops with an error and rejects offsets from the old assignment. Already emitted but uncommitted events may be replayed after restarting.

```tql
from_kafka "events",
  schema_registry="https://registry.example.com:8081",
  options={"bootstrap.servers": "kafka.example.com:9092"}
```

### `schema_registry_headers = record (optional)`

HTTP headers for registry requests. Values may be strings or secrets. Use this for registry authentication, which is separate from Kafka broker authentication. Requires `schema_registry`.

```tql
from_kafka "events",
  schema_registry="https://registry.example.com",
  schema_registry_headers={Authorization: secret("registry-authorization")}
```

### `schema_registry_tls = bool|record (optional)`

TLS settings for registry requests, using the same client TLS options as [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md). HTTPS uses TLS with certificate verification by default. Requires `schema_registry`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), every instance of `from_kafka` joins the same consumer group. The broker splits the subscribed partitions among the instances, so only one instance reads a given partition at a time. Delivery stays at-least-once: a partition that moves between instances can replay messages that no instance committed yet.

The topic’s partition count therefore caps how far the operator scales. Kafka assigns a partition to exactly one member of a group, so instances beyond the partition count receive an empty assignment and finish immediately. Reading a single-partition topic runs on one core no matter which degree you ask for. To read a topic with more parallelism, raise its partition count.

The operator falls back to a single instance when an argument ties the run to one consumer:

* `count`, because the limit applies per instance. Ten instances with `count=3` would emit 30 messages instead of 3.
* `offset`, unless it is `"stored"`. Every other value is re-applied whenever a consumer is assigned a partition, so a partition moving between instances would rewind or skip ahead instead of resuming from the group’s committed offset.
* `group.instance.id`, set either in `options` or in `kafka.yaml`, because it names one static member of the group. The broker fences instances that share the name as duplicates.

## Amazon MSK

The operator supports [Amazon MSK](../../integrations/amazon/msk.md) with IAM authentication.

### `aws_iam = record (optional)`

Configures explicit AWS credentials or IAM role assumption. If not specified, the operator uses the AWS SDK’s default credential chain.

```tql
{
  region: string,            // AWS region for API requests.
  access_key_id: string,     // AWS access key ID.
  secret_access_key: string, // AWS secret access key.
  session_token: string,     // session token for temporary credentials.
  assume_role: string,       // ARN of IAM role to assume.
  session_name: string,      // session name for role assumption.
  external_id: string,       // external ID for role assumption.
  web_identity: record,      // OIDC web identity token configuration.
}
```

See [AWS Authentication](../aws-authentication.md) for a description of every field, the default credential chain, web identity configuration, and local authentication with the AWS CLI.

### `aws_region = string (optional)`

The AWS region used to construct the MSK authentication URL. Required when connecting to MSK with IAM authentication.

### Consume from MSK using AWS IAM authentication

```tql
from_kafka "security-logs",
  options={"bootstrap.servers": "my-cluster.kafka.us-east-1.amazonaws.com:9098"},
  aws_iam={region: "us-east-1"}
```

## Examples

### Consume JSON messages and parse them

```tql
from_kafka "logs"
message = message.parse_json()
```

### Consume 100 messages starting from the beginning

```tql
from_kafka "events", count=100, offset="beginning"
```

### Consume messages and exit when caught up

```tql
from_kafka "alerts", exit=true
```

### Consume from topics that match a regular expression

```tql
from_kafka "^tenant-.*\\.alerts$", offset="beginning"
```

## See Also

* [`to_kafka`](https://tenzir.com/docs/reference/operators/to_kafka.md)
* [Kafka](../../integrations/kafka.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
