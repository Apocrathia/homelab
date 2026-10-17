---
title: "Amazon CloudWatch Logs integration"
description: "Centralized logging for AWS resources, applications, and custom logs."
canonical: https://tenzir.com/integrations/amazon/cloudwatch
source: https://tenzir.com/integrations/amazon/cloudwatch.md
section: "Integrations"
---

# Amazon CloudWatch Logs integration

> Centralized logging for AWS resources, applications, and custom logs.

[Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) is a monitoring and observability service in AWS. Tenzir can read CloudWatch events with [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md) and write events with [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md).

CloudWatch

CloudWatch stores log data in log groups and log streams. Use Tenzir to live tail new logs, search historical logs with filter patterns, replay one log stream, or forward pipeline output into an existing log stream.

## Configuration

See [AWS Authentication](../../reference/aws-authentication.md) for the available AWS authentication mechanisms. You can also pass credentials or assume an IAM role inline with `aws_iam`:

```tql
from_amazon_cloudwatch "/aws/lambda/api", mode="search", aws_iam={
  region: "us-east-1",
  assume_role: "arn:aws:iam::123456789012:role/cloudwatch-reader",
}
```

The [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md) operator expects the target log group and log stream to exist before the pipeline writes to them.

For AWS IAM-authenticated CloudWatch API calls, Tenzir needs these CloudWatch permissions:

| Use case                                                                                                                 | Required permissions   |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Live tail with [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md)         | `logs:StartLiveTail`   |
| Historical search with [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md) | `logs:FilterLogEvents` |
| Stream replay with [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md)     | `logs:GetLogEvents`    |
| Write with [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md) `method="put"`  | `logs:PutLogEvents`    |

If you set `unmask=true` for historical reads, the principal also needs `logs:Unmask`. HTTP ingestion writes with [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md) can use a bearer token instead of AWS IAM.

## Read from CloudWatch

The [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md) operator has three read modes. Choose the mode based on whether you need a continuous subscription, a historical search, or an exact replay of one stream:

| Mode     | AWS API           | Best for                                                                   |
| -------- | ----------------- | -------------------------------------------------------------------------- |
| `live`   | `StartLiveTail`   | Continuous monitoring and alerting on new log events.                      |
| `search` | `FilterLogEvents` | Historical searches and bounded backfills across streams in one log group. |
| `replay` | `GetLogEvents`    | Ordered replay from one known log stream.                                  |

Each mode emits events with the `tenzir.cloudwatch` schema. The `message` field contains the original log message as a string. If the message contains JSON, parse it in the next pipeline step:

```tql
from_amazon_cloudwatch "/aws/lambda/api", mode="search", filter="ERROR"
this = message.parse_json()
```

### Live tail new events

The default `mode="live"` uses CloudWatch Live Tail. Use it for pipelines that should keep running and process new events as they arrive, such as real-time detections, live dashboards, and forwarding pipelines:

```tql
from_amazon_cloudwatch \
  "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/api"
```

Live mode doesn’t read historical events. It requires log group ARNs, accepts up to 10 log groups, accepts `filter` for CloudWatch filter patterns, and can narrow the subscription to specific streams with `stream` or `stream_prefix`. Use stream filters only when subscribing to exactly one log group. Pass a list of log group ARNs to subscribe to multiple log groups in one Live Tail session:

```tql
from_amazon_cloudwatch [
  "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/api",
  "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/worker",
],
  filter="ERROR"
```

The historical options `start`, `end`, `count`, `from_start`, and `unmask` don’t apply to live mode.

### Search historical events

Use `mode="search"` when you want CloudWatch to scan existing events in a log group and return matches. This mode is a good fit for investigations, bounded backfills, scheduled catch-up jobs, and one-time exports:

```tql
from_amazon_cloudwatch "/aws/lambda/api",
  mode="search",
  filter="ERROR",
  start=2026-05-14T00:00:00Z,
  end=2026-05-14T01:00:00Z
```

The `filter` option accepts a [CloudWatch filter pattern](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html). Use `start` and `end` to bound the search window, and use `count` when you only need a sample or a fixed number of matches. To reduce the scope within the log group, pass one or more streams with `stream`, or pass a stream prefix with `stream_prefix`.

Search mode finishes when CloudWatch has returned all matching pages or when `count` is reached. It doesn’t stay attached for new events after the historical read completes.

### Replay one stream

Use `mode="replay"` when you know the exact log stream name and want to read that stream directly. This mode is useful for deterministic replays, debugging one Lambda invocation stream, and jobs that checkpoint or partition work by stream:

```tql
from_amazon_cloudwatch "/aws/lambda/api",
  mode="replay",
  stream="2026/05/14/[$LATEST]abcdef",
  from_start=true
```

Replay mode requires exactly one `stream`. It doesn’t accept `filter` or `stream_prefix`, because CloudWatch reads exactly one stream. Set `from_start=true` to replay from the oldest event in the stream, and use `start`, `end`, or `count` to bound the replay.

## Send to CloudWatch

Use [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md) to write events to an existing log group and log stream. The default `method="put"` uses the AWS `PutLogEvents` API. The `payload` option computes the CloudWatch log payload, and the `timestamp` option computes the CloudWatch event timestamp:

```tql
from {
  event_time: 2026-05-14T00:00:00Z,
  severity: "error",
  message: "login failed",
}
to_amazon_cloudwatch "/tenzir/alerts",
  stream="api",
  payload=this.print_json(),
  timestamp=event_time
```

When you omit `payload`, Tenzir serializes the whole incoming event as NDJSON. When you omit `timestamp`, Tenzir uses a `timestamp` field when present and the processing time otherwise.

CloudWatch no longer requires sequence tokens for `PutLogEvents`, so you can increase `parallel` for higher throughput to the same stream:

```tql
subscribe "alerts"
to_amazon_cloudwatch "/tenzir/alerts",
  stream="api",
  batch_size=1000,
  batch_timeout=1s,
  parallel=4
```

If your deployment exposes the CloudWatch HTTP Log Collector, use `method="hlc"` with a bearer token:

```tql
subscribe "alerts"
to_amazon_cloudwatch "/tenzir/alerts",
  stream="api",
  method="hlc",
  token=secret("cloudwatch-hlc-token")
```

## See Also

* [`from_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/from_amazon_cloudwatch.md)
* [`to_amazon_cloudwatch`](https://tenzir.com/docs/reference/operators/to_amazon_cloudwatch.md)
* [Fetch via HTTP and APIs](../../guides/collect/fetch-via-http-and-apis.md)
* [Send to destinations](../../guides/route/send-to-destinations.md)
* [AWS Authentication](../../reference/aws-authentication.md)
