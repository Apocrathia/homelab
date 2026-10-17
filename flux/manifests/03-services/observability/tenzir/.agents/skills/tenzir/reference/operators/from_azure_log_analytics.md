---
title: "from_azure_log_analytics"
canonical: https://tenzir.com/docs/reference/operators/from_azure_log_analytics
source: https://tenzir.com/docs/reference/operators/from_azure_log_analytics.md
section: "Docs"
---

# from_azure_log_analytics

> Runs a KQL query against an Azure Log Analytics workspace and reads its results.

Runs a KQL query against an Azure Log Analytics workspace and reads its results.

```tql
from_azure_log_analytics query:string, workspace_id=string|secret,
  azure_auth=record, [start=time, end=time, timeout=duration, tls=bool|record]
```

## Description

The `from_azure_log_analytics` operator is a finite source that queries the [Azure Monitor Logs Query API](https://learn.microsoft.com/en-us/rest/api/logsquery/query/execute). It sends your Kusto Query Language (KQL) string unchanged to `https://api.loganalytics.azure.com/v1/workspaces/{workspace_id}/query` and emits the returned rows as events. It doesn’t normalize the events to OCSF or ASIM.

Use this operator to read data already stored in a Log Analytics workspace, including tables used by Microsoft Sentinel. Unlike [`to_azure_log_analytics`](https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md), it needs a workspace ID rather than a data collection endpoint, data collection rule, or ingestion stream. Ingestion transformations, delays, and retention mean that reading a table doesn’t necessarily reproduce the original uploaded events. For native Microsoft Defender advanced hunting without workspace targeting, use [`from_microsoft_defender`](https://tenzir.com/docs/reference/operators/from_microsoft_defender.md).

Each result table produces separate event batches with the schema name `azure_log_analytics.<result-table-name>`, typically `azure_log_analytics.PrimaryResult`. The result-table name is not necessarily the name of the stored table queried by KQL. The operator doesn’t inject metadata fields into your events. Documented query statistics and visualization metadata aren’t emitted as events.

### Errors and limits

The operator validates the entire response before emitting any rows. Empty results, including `204 No Content`, succeed without events. Invalid JSON, invalid column descriptions, incompatible values, and service errors fail the pipeline. An HTTP `200` response containing `PartialError` also fails: partial results aren’t emitted. Diagnostics omit response bodies, credentials, and result values, and include a safe service request ID when available.

The operator retries throttling and transient HTTP failures with a bounded retry budget and honors `Retry-After`. It checks token freshness before every attempt, including after a retry delay. Permanent query and authorization errors aren’t retried. Retries reuse the original query and explicit time range, but relative KQL expressions such as `ago()` are evaluated by Azure on each attempt.

Azure [documents query API limits](https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/service-limits#query-api) of 500,000 rows and approximately 100 MiB of returned data. The operator also bounds response buffering to 128 MiB, accepts at most 64 result tables and 1,024 columns per table, and applies a decoded-value budget of 2,097,152 nodes across scalar and nested values. Deeply nested dynamic values are rejected. A response that exceeds a local limit fails rather than emitting a prefix.

There is no pagination, automatic time-window splitting, live polling, or durable cursor. Restarting the pipeline, including restoration from an executor snapshot, reruns the query and can replay events. A successful query isn’t a guarantee of complete historical extraction: availability depends on retention, table access, ingestion delay, and the query itself. Bound large queries with time predicates and projections. Splitting arbitrary KQL queries can change the meaning of aggregations, joins, and global limits.

### Result types

Column names and capitalization are preserved. The Azure column descriptions, not inference from string contents, control conversion:

| Azure type       | Tenzir type                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `bool`           | `bool`                                                           |
| `int`, `long`    | `int64`                                                          |
| `real`           | `double`                                                         |
| `datetime`       | `time`                                                           |
| `timespan`       | `duration`                                                       |
| `string`, `guid` | `string`                                                         |
| `decimal`        | Exact string representation, without conversion through `double` |
| `dynamic`        | Records, lists, or scalar values according to the JSON value     |

Nulls remain null, and all-null fixed-type columns retain their declared type. Integer values must fit their declared signed 32-bit or 64-bit type. Floating-point values must be finite. Numbers and booleans encoded as strings are accepted only in their corresponding numeric or boolean columns. Ordinary string columns stay strings even when they look like timestamps, IP addresses, or numbers.

KQL timespans use `[-][days.]hh:mm:ss[.fraction]`; values must fit Tenzir’s nanosecond-resolution duration range. Decimal values retain their exact textual representation, whether Azure encodes them as JSON numbers or strings.

Dynamic values can be native JSON or JSON serialized into a string. An outer dynamic string containing valid JSON is decoded, so `"42"`, `"true"`, and `"null"` become a number, a boolean, and null. Nested strings don’t undergo additional inference. Heterogeneous lists keep each element with its own type, so a list can mix strings, numbers, and records. Duplicate object keys and out-of-range dynamic integers are rejected.

### `query: string`

The required, nonempty KQL query. You can select tables, filter events, join, aggregate, and project computed columns. The operator doesn’t rewrite the query or push downstream filters, projections, or limits into it.

### `workspace_id = string | secret`

The required Log Analytics workspace GUID, available in the workspace’s **Properties** page in the Azure portal. This isn’t an Azure resource ID, tenant ID, DCR ID, or workspace name.

### `azure_auth = record`

Required Microsoft Entra application credentials:

| Field           | Type                 | Description                                         |
| --------------- | -------------------- | --------------------------------------------------- |
| `tenant_id`     | `string` or `secret` | Tenant ID or domain. Required.                      |
| `client_id`     | `string` or `secret` | Application client ID. Required.                    |
| `client_secret` | `string` or `secret` | Application client secret. Required.                |
| `scope`         | `string` or `secret` | Defaults to `https://api.loganalytics.io/.default`. |
| `authority`     | `string` or `secret` | Defaults to `https://login.microsoftonline.com`.    |

The endpoint targets Azure public cloud. The token audience retains the `api.loganalytics.io` hostname even though requests use `api.loganalytics.azure.com`. It differs from the ingestion API’s `https://monitor.azure.com/.default` scope.

Follow Microsoft’s [API authentication instructions](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/access-api) to register an application and grant it query access to your workspace. A workspace role such as **Log Analytics Reader** provides read access; a custom role can restrict the accessible tables. DCR ingestion permissions alone don’t grant workspace query access. The operator supports app-only client-secret authentication, not ambient credentials, delegated tokens, or `web_identity`.

### `start = time`, `end = time` (optional)

Specify both arguments or neither. The start must precede the end. The operator encodes them as a single ISO 8601 `timespan` interval and reuses it for retries. Azure applies this range in addition to time restrictions in your KQL query. The operator doesn’t inject a `TimeGenerated` predicate.

When omitted, the request doesn’t specify a time range and Azure queries all available data subject to the query’s own filters.

### `timeout = duration` (optional)

The server-side query timeout. Defaults to `3min`; must be positive and at most `10min`. The operator rounds up to whole seconds for the `Prefer: wait` header. The HTTP attempt timeout includes an additional 30 seconds for transport. Retry delays and additional attempts can make total execution take longer.

### `tls = bool | record` (optional)

TLS configuration for the query endpoint, following the standard Tenzir TLS options. HTTPS and certificate verification are enabled by default. Use a record to configure a custom trust store, for example with `cacert`.

## Examples

### Read security events for a bounded interval

```tql
from_azure_log_analytics "SecurityEvent | project TimeGenerated, Computer, EventID",
  workspace_id=secret("azure-workspace-id"),
  azure_auth={
    tenant_id: secret("azure-tenant-id"),
    client_id: secret("azure-client-id"),
    client_secret: secret("azure-client-secret"),
  },
  start=2026-01-01,
  end=2026-01-02
```

### Aggregate custom-table events

```tql
from_azure_log_analytics "MyLogs_CL | summarize Count=count() by Computer",
  workspace_id=secret("azure-workspace-id"),
  azure_auth={
    tenant_id: secret("azure-tenant-id"),
    client_id: secret("azure-client-id"),
    client_secret: secret("azure-client-secret"),
  },
  start=2026-01-01,
  end=2026-01-02,
  timeout=5min
```

## See also

* [Azure Log Analytics](../../integrations/microsoft/azure-log-analytics.md)
* [Azure Authentication](../azure-authentication.md)
