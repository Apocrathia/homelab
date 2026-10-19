---
title: "from_amazon_cloudwatch"
canonical: https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch
source: https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md
section: "Docs"
---

# from_amazon_cloudwatch

> Reads events from Amazon CloudWatch.

Reads events from Amazon CloudWatch.

```tql
from_amazon_cloudwatch group:string|list<string>, [mode=string,
  stream=string|list<string>, stream_prefix=string, filter=string,
  start=time, end=time, count=int, from_start=bool, unmask=bool,
  aws_region=string, aws_iam=record]
```

## Description

The `from_amazon_cloudwatch` operator reads CloudWatch events and emits one event per log entry.

The emitted events use the `tenzir.cloudwatch` schema:

| Field            | Type     | Description                           |
| ---------------- | -------- | ------------------------------------- |
| `timestamp`      | `time`   | The CloudWatch event timestamp.       |
| `ingestion_time` | `time`   | The CloudWatch ingestion timestamp.   |
| `log_group`      | `string` | The log group that contains the log.  |
| `log_stream`     | `string` | The log stream that contains the log. |
| `message`        | `string` | The log message.                      |
| `event_id`       | `string` | The CloudWatch event ID, if present.  |

### `group: string|list<string>`

Log group name or identifier to read from.

Use log group ARNs with `mode="live"`. Live mode accepts at most 10 log groups. Use a list only with `mode="live"`; historical modes require exactly one log group.

### `mode = string (optional)`

Read mode.

Supported values:

* `live`: Subscribe with CloudWatch Live Tail for continuous processing of new events. This mode doesn’t read historical events.
* `search`: Search historical events in one log group with `FilterLogEvents`. Use this mode for investigations, bounded backfills, and exports across one or more streams in the group.
* `replay`: Replay one known log stream with `GetLogEvents`. This mode requires exactly one `stream`.

Defaults to `live`. For detailed mode selection guidance, see [Amazon CloudWatch Logs](../../integrations/amazon/cloudwatch.md).

### `stream = string|list<string> (optional)`

Log stream name or names to read.

In `mode="replay"`, this option is required and must name exactly one stream. In `mode="live"` and `mode="search"`, this option narrows the read to one or more streams. In live mode, `stream` requires exactly one `group`. Live and search modes accept at most 100 streams.

This option is mutually exclusive with `stream_prefix`.

### `stream_prefix = string (optional)`

Non-empty prefix for selecting log streams in `mode="live"` or `mode="search"`.

This option is mutually exclusive with `stream`. In live mode, `stream_prefix` requires exactly one `group`.

### `filter = string (optional)`

CloudWatch filter pattern.

This option isn’t valid with `mode="replay"`.

### `start = time (optional)`

Earliest event timestamp to read in `mode="search"` or `mode="replay"`.

### `end = time (optional)`

Latest event timestamp to read in `mode="search"` or `mode="replay"`.

### `count = int (optional)`

Maximum number of events to read in `mode="search"` or `mode="replay"`.

The maximum value is `2147483647`.

### `from_start = bool (optional)`

Whether `mode="replay"` should read from the start of the log stream.

### `unmask = bool (optional)`

Whether to unmask protected log data when the AWS principal has permission.

This option is valid for `mode="search"` and `mode="replay"`.

### `aws_region = string (optional)`

AWS region for CloudWatch requests.

If omitted, the operator uses the region from `aws_iam` when present. Otherwise, it uses the AWS SDK’s default region resolution.

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

## Examples

### Live tail a log group

```tql
from_amazon_cloudwatch \
  "arn:aws:logs:us-east-1:123456789012:log-group:/aws/vpc/flowlogs"
```

### Live tail multiple log groups

```tql
from_amazon_cloudwatch [
  "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/api",
  "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/worker",
],
  filter="ERROR"
```

### Search historical events

```tql
from_amazon_cloudwatch "/aws/lambda/api",
  mode="search",
  filter="ERROR",
  start=2026-05-14T00:00:00Z,
  end=2026-05-14T01:00:00Z
```

### Replay one log stream

```tql
from_amazon_cloudwatch "/aws/lambda/api",
  mode="replay",
  stream="2026/05/14/[$LATEST]abcdef",
  from_start=true
```

### Assume an IAM role

```tql
from_amazon_cloudwatch "/aws/lambda/api",
  mode="search",
  aws_iam={
    region: "us-east-1",
    assume_role: "arn:aws:iam::123456789012:role/cloudwatch-reader"
  }
```

## See Also

* [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md)
* [Amazon CloudWatch Logs](../../integrations/amazon/cloudwatch.md)
