---
title: "to_kafka"
canonical: https://tenzir.com/docs/reference/operators/to_kafka
source: https://tenzir.com/docs/reference/operators/to_kafka.md
section: "Docs"
---

# to_kafka

> Sends messages to an Apache Kafka topic.

Sends messages to an Apache Kafka topic.

```tql
to_kafka topic:string, [message=blob|string, key=string, timestamp=time,
         options=record, aws_iam=record, aws_region=string]
```

## Description

The `to_kafka` operator sends one message per event to a Kafka topic.

The implementation uses the official [librdkafka](https://github.com/confluentinc/librdkafka) from Confluent and supports all [configuration options](https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md). You can specify them via `options` parameter as `{key: value, ...}`.

The operator injects the following default librdkafka configuration values in case no configuration file is present, or when the configuration does not include them:

* `bootstrap.servers`: `localhost`
* `client.id`: `tenzir`

### `topic: string`

The exact Kafka topic to send messages to. Regular expressions aren’t supported for producers.

### `message = blob|string (optional)`

An expression that evaluates to the message content for each row.

Defaults to `this.print_ndjson()` when not specified.

### `key = string (optional)`

Sets a fixed key for all messages. This keeps the operator on a single instance, as described in [Parallelism](to_kafka.md#parallelism).

### `timestamp = time (optional)`

Sets a fixed timestamp for all messages.

### `options = record (optional)`

A record of key-value configuration options for [librdkafka](https://github.com/confluentinc/librdkafka), e.g., `{"acks": "all", "batch.size": 16384}`.

The `to_kafka` operator passes the key-value pairs directly to [librdkafka](https://github.com/confluentinc/librdkafka). Consult the list of available [configuration options](https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md) to configure Kafka according to your needs.

We recommend factoring these options into the plugin-specific `kafka.yaml` so that they are independent of the `to_kafka` arguments.

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

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_kafka` sends through its own producer. Unlike [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md), the operator scales past the topic’s partition count, because any producer may write to any partition.

Kafka orders messages only within a partition, and without a `key` the partitioner spreads messages across all of them, so a topic never reflects the pipeline’s event order. Parallelism does change what a single partition sees: instead of a contiguous run of events from one producer, it receives messages interleaved from all of them. Keep parallelism disabled if a consumer of the topic relies on the order within one partition.

Setting `key` keeps the operator on a single instance. The key is one constant for the whole run, so every message hashes to the same partition. Independent producers would interleave their requests into that partition without gaining any throughput, because a partition accepts writes at the same rate no matter how many producers target it.

## Examples

### Send NDJSON-formatted events to topic `events` (using default)

Stream security events to a Kafka topic with automatic JSON formatting:

```tql
subscribe "security-alerts"
where severity >= "high"
select timestamp, source_ip, alert_type, details
to_kafka "events"
```

This pipeline subscribes to security alerts, filters for high-severity events, selects relevant fields, and sends them to Kafka as JSON. Each event is formatted using `this.print_ndjson()`, producing one compact JSON object per message:

```json
{"timestamp":"2024-03-15T10:30:00.000000","severity":"high"}
```

### Send NDJSON-formatted events with explicit message

```tql
subscribe "logs"
to_kafka "events", message=this.print_ndjson()
```

### Send specific field values with a timestamp

```tql
subscribe "logs"
to_kafka "alerts", message=alert_msg, timestamp=2024-01-01T00:00:00
```

### Send data with a fixed key for partitioning

```tql
metrics
to_kafka "metrics", message=this.print_ndjson(), key="server-01"
```

## See Also

* [`from_kafka`](https://tenzir.com/docs/reference/operators/from_kafka.md)
* [Kafka](../../integrations/kafka.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
