---
title: "to_amazon_sqs"
canonical: https://tenzir.com/docs/reference/operators/to_amazon_sqs
source: https://tenzir.com/docs/reference/operators/to_amazon_sqs.md
section: "Docs"
---

# to_amazon_sqs

> Sends messages to an Amazon SQS queue.

Sends messages to an [Amazon SQS](https://docs.aws.amazon.com/sqs/) queue.

```tql
to_amazon_sqs queue:str, [message=str|blob, aws_region=str, aws_iam=record]
```

## Description

[Amazon Simple Queue Service (Amazon SQS)](https://docs.aws.amazon.com/sqs/) is a fully managed message queueing service for decoupling distributed systems. The `to_amazon_sqs` operator sends one SQS message per input event.

By default, `to_amazon_sqs` serializes each input event as NDJSON. Use the `message` option to send a specific string or blob expression instead. If the expression evaluates to `null` or another type, the operator skips that event and emits a warning.

The operator requires the following AWS permissions:

* `sqs:GetQueueUrl` (only when passing a queue name; not required for URLs)
* `sqs:SendMessage`

### `queue: str`

The name of the queue to send messages to. You can optionally prefix the queue name with `sqs://`.

You can also pass a full queue URL (`https://...` or `http://...`) instead of a name. When a URL is given, the operator skips the `GetQueueUrl` lookup and talks to the URL’s host directly. Set `aws_region` when the queue is in a non-default AWS region so SigV4 signing matches.

### `message = str | blob (optional)`

The expression that produces the SQS message body.

Defaults to `this.print_ndjson()`.

### `aws_region = str (optional)`

The AWS region for resolving the queue URL and sending messages.

If omitted, the operator uses the region from `aws_iam` when present. Otherwise, it uses the default AWS SDK region resolution.

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

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_amazon_sqs` sends messages through its own SQS client. Standard queues give no ordering guarantee across messages, so replicating the operator weakens no guarantee that a single instance provided.

## Examples

### Send events to a queue

```tql
subscribe "to-amazon-sqs"
to_amazon_sqs "sqs://tenzir"
```

### Send a specific field as the message body

```tql
from {payload: "security event detected"}
to_amazon_sqs "alerts-queue", message=payload
```

### Use an explicit region

```tql
from {alert: "security event detected"}
to_amazon_sqs "alerts-queue", aws_region="us-east-1"
```

### Pass a queue URL directly

```tql
from {alert: "security event detected"}
to_amazon_sqs "https://sqs.eu-west-1.amazonaws.com/123456789012/alerts-queue",
  aws_region="eu-west-1"
```

### Use explicit credentials

```tql
from {alert: "security event detected"}
to_amazon_sqs "alerts-queue", aws_iam={
  region: "us-east-1",
  access_key_id: secret("aws-key"),
  secret_access_key: secret("aws-secret")
}
```

### Assume an IAM role

```tql
subscribe "events"
to_amazon_sqs "my-queue", aws_iam={
  region: "eu-west-1",
  assume_role: "arn:aws:iam::123456789012:role/my-sqs-role"
}
```

## See Also

* [`from_amazon_sqs`](https://tenzir.com/docs/reference/operators/from_amazon_sqs.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [Amazon SQS](../../integrations/amazon/sqs.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
