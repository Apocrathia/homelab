---
title: "to_amazon_kinesis"
canonical: https://tenzir.com/docs/reference/operators/to_amazon_kinesis
source: https://tenzir.com/docs/reference/operators/to_amazon_kinesis.md
section: "Docs"
---

# to_amazon_kinesis

> Sends records to an Amazon Kinesis Data Streams stream.

Sends records to an [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis/data-streams/) stream.

```tql
to_amazon_kinesis stream:string, [message=blob|string, partition_key=string,
                   batch_size=int, batch_timeout=duration, parallel=int,
                   aws_region=string, aws_iam=record, endpoint=string]
```

## Description

The `to_amazon_kinesis` operator sends records to a Kinesis data stream with `PutRecords`.

By default, `to_amazon_kinesis` serializes each input event as NDJSON with `this.print_ndjson()`. Use the `message` option to send a specific string or blob expression instead. If the expression evaluates to `null` or another type, the operator skips that event and emits a warning.

If you omit `partition_key`, the operator generates a random UUID for each record. A partition key expression must produce non-empty strings up to 256 characters. Kinesis record payloads plus their partition key must fit the stream’s configured maximum record size, which defaults to 1 MiB and can be raised to 10 MiB. The operator discovers the limit at startup via `kinesis:DescribeStreamSummary`; without that permission it falls back to the 10 MiB API maximum and lets the service enforce the effective limit. Events that exceed these limits are skipped with a warning.

The operator retries failed `PutRecords` entries with exponential backoff before emitting an error.

The operator requires the `kinesis:PutRecords` AWS permission and uses `kinesis:DescribeStreamSummary` when available.

### `stream: string`

The name of the Kinesis data stream to send records to.

### `message = blob | string (optional)`

The expression that produces the Kinesis record payload for each event.

Defaults to `this.print_ndjson()`.

### `partition_key = string (optional)`

The expression that produces the Kinesis partition key for each event.

If omitted, the operator generates a random UUID per event.

### `batch_size = int (optional)`

The maximum number of records per `PutRecords` request.

The value must be between `1` and `500`.

Defaults to `500`.

### `batch_timeout = duration (optional)`

How long to wait before flushing a non-empty batch.

The value must be positive.

Defaults to `1s`.

### `parallel = int (optional)`

The maximum number of concurrent `PutRecords` requests.

Values greater than one overlap request round trips and multiply write throughput accordingly, but concurrent requests can complete out of order. `PutRecords` also does not guarantee record order with one request in flight, so this operator cannot provide strict ordering within a shard at any value.

The value must be greater than zero.

Defaults to `1`.

### `aws_region = string (optional)`

The AWS region for writing to the stream.

If omitted, the operator uses the region from `aws_iam` when present. Otherwise, it uses the default AWS SDK region resolution.

### `endpoint = string (optional)`

A custom Kinesis endpoint URL.

If omitted, the operator uses `AWS_ENDPOINT_URL_KINESIS` when set, then `AWS_ENDPOINT_URL`, then the default AWS SDK endpoint for the region.

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

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_amazon_kinesis` sends records through its own Kinesis client.

The `partition_key` routes records to shards but does not pin them to an instance: two events with the same partition key may be produced by different instances and therefore arrive in their shard out of the pipeline’s event order. The operator uses `PutRecords`, which does not guarantee record order even within one request. As a result, `to_amazon_kinesis` cannot guarantee ordering within a shard regardless of the pipeline’s or operator’s parallelism.

## Examples

### Send NDJSON events

```tql
subscribe "alerts"
to_amazon_kinesis "security-events"
```

### Send a custom payload

```tql
from {payload: "security event detected", tenant: "acme"}
to_amazon_kinesis "security-events",
  message=payload,
  partition_key=tenant
```

### Send JSON strings with an explicit partition key

```tql
subscribe "alerts"
to_amazon_kinesis "security-events",
  message=this.print_json(),
  partition_key=string(src_ip)
```

### Configure batching

```tql
subscribe "alerts"
to_amazon_kinesis "security-events",
  batch_size=100,
  batch_timeout=500ms
```

### Use explicit credentials

```tql
subscribe "alerts"
to_amazon_kinesis "security-events", aws_iam={
  region: "us-east-1",
  access_key_id: secret("aws-key"),
  secret_access_key: secret("aws-secret")
}
```

### Use a LocalStack endpoint

```tql
from {alert: "test"}
to_amazon_kinesis "security-events",
  aws_region="us-east-1",
  endpoint="http://127.0.0.1:4566"
```

## See Also

* [`from_amazon_kinesis`](https://tenzir.com/docs/reference/operators/from_amazon_kinesis.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [Amazon Kinesis](../../integrations/amazon/kinesis.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
