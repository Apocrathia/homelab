---
title: "to_google_cloud_logging"
canonical: https://tenzir.com/docs/reference/operators/to_google_cloud_logging
source: https://tenzir.com/docs/reference/operators/to_google_cloud_logging.md
section: "Docs"
---

# to_google_cloud_logging

> Sends events to Google Cloud Logging.

Sends events to Google Cloud Logging.

```tql
to_google_cloud_logging log_id=string, [project=string, organization=string,
          billing_account=string, folder=string,] [resource_type=string,
          resource_labels=record, payload=string, severity=string,
          timestamp=time, service_credentials=string, batch_timeout=duration,
          max_batch_size=int, parallel=int]
```

## Description

Sends events to [Google Cloud Logging](https://cloud.google.com/logging).

### `log_id = string`

ID to associated the ingested logs with. It must be less than 512 characters long and can only include the following characters: upper and lower case alphanumeric characters, forward-slash, underscore, hyphen, and period.

### `project = string (optional)`

A project id to associated the ingested logs with.

### `organization = string (optional)`

An organization id to associated the ingested logs with.

### `billing_account = string (optional)`

A billing account id to associated the ingested logs with.

### `folder = string (optional)`

A folder id to associated the ingested logs with.

Note

At most one of `project`, `organization`, `billing_account`, and `folder` can be set. If none is set, the operator tries to fetch the project id from the metadata server.

### `resource_type = string (optional)`

The type of the [monitored resource](https://cloud.google.com/logging/docs/reference/v2/rest/v2/MonitoredResource). All available types with their associated labels are listed [here](https://cloud.google.com/logging/docs/api/v2/resource-list).

Defaults to `global`.

### `resource_labels = record (optional)`

Record of associated labels for the resource. Values of the record must be of type `string`.

Consult the [official docs](https://cloud.google.com/logging/docs/api/v2/resource-list) for available types with their associated labels.

### `payload = string (optional)`

The log entry payload. If unspecified, the incoming event is serialised as JSON and sent.

### `service_credentials = string (optional)`

JSON credentials to use if using a service account.

### `severity = string (optional)`

Severity of the event. Consult the [official docs](https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity) for available severity levels.

Defaults to `default`.

### `timestamp = time (optional)`

Timestamp of the event.

### `batch_timeout = duration (optional)`

Maximum interval between sending the events.

Defaults to `5s`.

### `max_batch_size = int (optional)`

Maximum events to batch before sending.

Defaults to `1k`.

### `parallel = int (optional)`

The maximum number of concurrent requests per operator instance.

Defaults to `10`. Must be at least `1`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_google_cloud_logging` batches, authenticates, and sends independently with its own client and credentials. Because `parallel` bounds the requests in flight within one instance, the pipeline-wide bound is `parallel` times the number of instances.

The API ingests every request on its own and gives no ordering guarantee across requests. Keep the effective concurrency in mind when tuning `parallel` against your project’s [Cloud Logging write quota](https://cloud.google.com/logging/quotas).

## Example

## Send logs, authenticating automatically via ADC

```tql
from {
  content: "log message",
  timestamp: now(),
}
to_google_cloud_logging log_id="LOG_ID", project="PROJECT_ID"
```

## Send logs using a service account

```tql
from {
  content: "totally not a made up log",
  timestamp: now(),
  resource: "global",
}
to_google_cloud_logging log_id="LOG_ID", project="PROJECT_ID"
  resource_type=resource,
  service_credentials=file_contents("/path/to/credentials.json")
```

## See Also

* [`to_google_secops`](https://tenzir.com/docs/reference/operators/to_google_secops.md)
* [Google Cloud Logging](../../integrations/google/cloud-logging.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
