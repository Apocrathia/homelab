---
title: "Amazon Kinesis integration"
description: "Ingest and process real-time data streams from Amazon Kinesis."
canonical: https://tenzir.com/integrations/amazon/kinesis
source: https://tenzir.com/integrations/amazon/kinesis.md
section: "Integrations"
---

# Amazon Kinesis integration

> Ingest and process real-time data streams from Amazon Kinesis.

[Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) is a managed streaming data service on AWS.

Tenzir can receive records from Kinesis streams with

[`from_amazon_kinesis`](https://tenzir.com/docs/reference/operators/from_amazon_kinesis.md) and send records to Kinesis streams with [`to_amazon_kinesis`](https://tenzir.com/docs/reference/operators/to_amazon_kinesis.md).

When Tenzir reads from Kinesis, it emits one event per Kinesis record. The event uses the `tenzir.amazon_kinesis` schema and contains the raw record payload in the `message` field as a `blob`, together with metadata such as the stream, shard, sequence number, partition key, arrival time, and lag.

Tenzir does not parse or decompress Kinesis payloads automatically. Convert the `message` blob explicitly in TQL when the stream contains structured data:

```tql
from_amazon_kinesis "security-events", start="trim_horizon"
this = string(message).parse_json()
```

The source operator lists shards during startup and discovers new shards when an existing shard closes, such as after a resharding operation, so running pipelines follow reshards without a restart. Snapshots store per-shard sequence numbers and resume with at-least-once semantics.

## Configuration

Follow the [Amazon integration configuration](../amazon.md) to authenticate with your AWS credentials.

Alternatively, use the `aws_iam` parameter to provide explicit credentials:

```tql
from_amazon_kinesis "security-events", aws_iam={
  region: "us-east-1",
  access_key_id: secret("aws-key"),
  secret_access_key: secret("aws-secret")
}
```

You can also use `aws_iam` to assume an IAM role:

```tql
from_amazon_kinesis "security-events", aws_iam={
  region: "eu-west-1",
  assume_role: "arn:aws:iam::123456789012:role/my-kinesis-role",
  session_name: "tenzir-session"
}
```

Set `endpoint` to use a Kinesis-compatible endpoint, such as LocalStack:

```tql
from_amazon_kinesis "security-events",
  aws_region="us-east-1",
  endpoint="http://127.0.0.1:4566"
```

When `endpoint` is omitted, Tenzir checks `AWS_ENDPOINT_URL_KINESIS` first, then `AWS_ENDPOINT_URL`, then uses the default AWS SDK endpoint for the region.

Tenzir needs these Kinesis permissions:

| Operator                                                                                    | Required permissions                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`from_amazon_kinesis`](https://tenzir.com/docs/reference/operators/from_amazon_kinesis.md) | `kinesis:ListShards`, `kinesis:GetShardIterator`, `kinesis:GetRecords` |
| [`to_amazon_kinesis`](https://tenzir.com/docs/reference/operators/to_amazon_kinesis.md)     | `kinesis:PutRecords`                                                   |

## Examples

### Send events to a stream

```tql
subscribe "alerts"
to_amazon_kinesis "security-events"
```

This sends one NDJSON record per input event by using the default `message=this.print_ndjson()` expression.

### Send a custom payload

```tql
from {payload: "security event detected", tenant: "acme"}
to_amazon_kinesis "security-events",
  message=payload,
  partition_key=tenant
```

If you omit `partition_key`, Tenzir generates a random UUID per event.

### Receive and parse JSON records

```tql
from_amazon_kinesis "security-events",
  start="trim_horizon",
  count=100,
  exit=true
this = string(message).parse_json()
```

### Read from a timestamp

```tql
from_amazon_kinesis "security-events", start=2026-01-01T00:00:00Z
```

## See Also

* [`from_amazon_kinesis`](https://tenzir.com/docs/reference/operators/from_amazon_kinesis.md)
* [`to_amazon_kinesis`](https://tenzir.com/docs/reference/operators/to_amazon_kinesis.md)
* [Read from message brokers](../../guides/collect/read-from-message-brokers.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [Amazon SQS](sqs.md)
* [Kafka](../kafka.md)
