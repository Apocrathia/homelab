---
title: "from_microsoft_365_activity"
canonical: https://tenzir.com/docs/reference/operators/from_microsoft_365_activity
source: https://tenzir.com/docs/reference/operators/from_microsoft_365_activity.md
section: "Docs"
---

# from_microsoft_365_activity

> Reads unified audit records from the Microsoft 365 Management Activity API.

Reads unified audit records from the Microsoft 365 Management Activity API.

```tql
from_microsoft_365_activity auth=record, content_types=list<string>,
  [start_time=time, end_time=time, poll_interval=duration,
   start_missing_subscriptions=bool, publisher_identifier=string,
   cloud=string, tls=bool|record]
```

## Description

The `from_microsoft_365_activity` operator reads audit content from the [Office 365 Management Activity API](https://learn.microsoft.com/en-us/office/office-365-management-api/office-365-management-activity-api-reference). It emits every audit record in a content blob as a separate event and preserves the fields that Microsoft returned.

This API is separate from Microsoft Graph. Use `from_microsoft_graph` for Graph resources such as users and sign-in logs. Use `from_microsoft_365_activity` for the unified audit feed from Exchange, SharePoint, Microsoft Entra ID, Microsoft 365, and data loss prevention workloads.

The operator adds a `microsoft_365_activity` record to every event:

| Field                | Type     | Description                                                   |
| -------------------- | -------- | ------------------------------------------------------------- |
| `tenant_id`          | `string` | The tenant from the authentication configuration.             |
| `content_type`       | `string` | The workload category for the content blob.                   |
| `content_id`         | `string` | Microsoft’s opaque identifier for the content blob.           |
| `content_created`    | `time`   | The time when Microsoft made the blob available.              |
| `content_expiration` | `time`   | The time after which Microsoft can no longer return the blob. |

The operator fails if an audit record already contains a top-level `microsoft_365_activity` field.

### Delivery and checkpoints

The operator provides at-least-once delivery. It records completed `contentId` values in its executor snapshot and restores them when the pipeline restarts from that snapshot. A blob becomes complete after the operator emits all of its records. During continuous collection, the operator keeps the identifiers from the previous polling interval, which is the range the next cycle rereads. A bounded backfill keeps its identifiers until it completes.

Checkpointing prevents blob refetches caused by overlapping windows, retries, or restarts. Microsoft can also put duplicate audit records in the feed. The operator doesn’t remove those record-level duplicates. You can deduplicate them downstream with the audit record’s `Id` and tenant or organization identifier.

### Time ranges

Pass `start_time` to backfill from that point to the time when the operator starts. After the backfill, the operator continues polling. Add `end_time` to make the interval bounded and stop after the backfill. The interval is inclusive at the start and exclusive at the end. These parameters filter on a blob’s `contentCreated` time, not an audit record’s `CreationTime`.

The Activity API limits each request to 24 hours and retains content for seven days. The operator rejects a start time older than seven days and splits longer accepted ranges into requests of at most 24 hours. The API accepts timestamps at second precision, so the operator truncates window boundaries to whole seconds.

The `start_time` value must be in the past. The `end_time` value cannot be in the future, because a bounded backfill describes a complete historical interval. An `end_time` without a `start_time` is invalid.

Omit both timestamps to start continuous collection with an initial lookback of one polling interval. On every later cycle, the operator reads the previous interval again and skips completed content IDs. This overlap prevents gaps when content becomes visible late. Audit records in a new blob can have event timestamps older than the queried content-availability interval.

### Subscriptions

The operator checks that every selected content type has an enabled Activity API subscription. A missing or disabled subscription stops the pipeline with a diagnostic by default.

Set `start_missing_subscriptions=true` to let the operator start missing subscriptions. This option changes persistent tenant state. Microsoft can take up to 12 hours to produce the first content after you start a subscription. When multiple subscriptions are missing, the operator waits 15 minutes between start requests as required by the API. The operator doesn’t stop subscriptions or manage webhooks.

### Retries and throttling

The operator retries transient transport failures, `429` responses, and retryable `5xx` responses with a bounded delay. It honors the `Retry-After` header. It processes one metadata page at a time and fetches its blobs sequentially in expiration order. This bounds memory and request concurrency while prioritizing content closest to expiration within each page.

### `auth = record`

Microsoft Entra application credentials for client-credentials authentication.

| Field           | Type                 | Description                           |
| --------------- | -------------------- | ------------------------------------- |
| `tenant_id`     | `string` or `secret` | The Microsoft Entra tenant GUID.      |
| `client_id`     | `string` or `secret` | The application client ID.            |
| `client_secret` | `string` or `secret` | The application client secret.        |
| `scope`         | `string` or `secret` | An optional OAuth scope override.     |
| `authority`     | `string` or `secret` | An optional OAuth authority override. |

The application needs the `ActivityFeed.Read` application permission. Reading `DLP.All` requires `ActivityFeed.ReadDlp`. Unified audit logging must also be enabled for the Microsoft 365 organization.

The default OAuth scope matches the selected `cloud`. For the commercial cloud it is `https://manage.office.com/.default`, not the Microsoft Graph scope. The default authority is `https://login.microsoftonline.us` for `gcc_high` and `dod`, and `https://login.microsoftonline.com` otherwise.

### `content_types = list<string>`

The workload categories to collect. The operator accepts these values:

* `Audit.AzureActiveDirectory`
* `Audit.Exchange`
* `Audit.SharePoint`
* `Audit.General`
* `DLP.All`

### `start_time = time (optional)`

The inclusive start of a content-availability backfill. The value must be in the past and cannot be more than seven days old. Without `end_time`, the operator backfills through its startup time and then continues polling.

### `end_time = time (optional)`

The exclusive end of a bounded content-availability interval. You must also set `start_time`. The value cannot be in the future. When set, the operator stops after processing the interval.

### `poll_interval = duration (optional)`

The delay between continuous collection cycles. Defaults to `15min`. The value must be positive and cannot be combined with `end_time`. You can combine it with `start_time` to control polling after an initial backfill.

### `start_missing_subscriptions = bool (optional)`

Whether to start subscriptions that are missing or disabled. Defaults to `false`.

### `publisher_identifier = string (optional)`

The tenant GUID of the vendor that built the API client. Microsoft uses this value to assign a dedicated throttling quota. For an integration built only for your own tenant, use your tenant GUID. The operator sends the value with every subscription, metadata, pagination, and blob request.

### `cloud = string (optional)`

The Microsoft 365 cloud. Defaults to `commercial`.

| Value        | API host                     |
| ------------ | ---------------------------- |
| `commercial` | `manage.office.com`          |
| `gcc`        | `manage-gcc.office.com`      |
| `gcc_high`   | `manage.office365.us`        |
| `dod`        | `manage.protection.apps.mil` |

### `tls = bool | record (optional)`

TLS options for Activity API requests. Use a record to configure options such as `cacert` when a local proxy or custom trust store intercepts HTTPS traffic.

## Examples

### Collect a bounded interval

```tql
from_microsoft_365_activity auth={
    tenant_id: secret("m365-tenant-id"),
    client_id: secret("m365-client-id"),
    client_secret: secret("m365-client-secret"),
  },
  content_types=["Audit.Exchange", "Audit.SharePoint", "Audit.General"],
  start_time=now() - 2h,
  end_time=now() - 1h,
  publisher_identifier="00000000-0000-0000-0000-000000000000"
```

### Collect continuously

```tql
from_microsoft_365_activity auth={
    tenant_id: secret("m365-tenant-id"),
    client_id: secret("m365-client-id"),
    client_secret: secret("m365-client-secret"),
  },
  content_types=[
    "Audit.AzureActiveDirectory",
    "Audit.Exchange",
    "Audit.SharePoint",
    "Audit.General",
  ],
  poll_interval=15min,
  publisher_identifier="00000000-0000-0000-0000-000000000000"
```

### Backfill, then continue collecting

```tql
from_microsoft_365_activity auth={
    tenant_id: secret("m365-tenant-id"),
    client_id: secret("m365-client-id"),
    client_secret: secret("m365-client-secret"),
  },
  content_types=["Audit.General"],
  start_time=now() - 6h,
  poll_interval=15min
```

## See Also

* [`from_microsoft_graph`](https://tenzir.com/docs/reference/operators/from_microsoft_graph.md)
