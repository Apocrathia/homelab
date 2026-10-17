---
title: "Hydrolix integration"
description: "Stream security telemetry into Hydrolix tables and query it back."
canonical: https://tenzir.com/integrations/hydrolix
source: https://tenzir.com/integrations/hydrolix.md
section: "Integrations"
---

# Hydrolix integration

> Stream security telemetry into Hydrolix tables and query it back.

[Hydrolix](https://hydrolix.io) is a streaming data lake for log and event data. It stores events in compressed, time-partitioned tables in object storage and answers queries with SQL. Use Tenzir to collect, parse, and normalize events before streaming them into Hydrolix with [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md), and to read events back out of Hydrolix with [`from_hydrolix`](https://tenzir.com/docs/reference/operators/from_hydrolix.md), for example to enrich, correlate, or forward them.

The operator talks to the [Hydrolix HTTP Stream API](https://docs.hydrolix.io/latest/self-managed/load-data/streaming-ingest/streaming-http/) and follows the practices of the [Hydrolix ingest integration guide](https://docs.hydrolix.io/latest/self-managed/load-data/streaming-ingest/streaming-http/ingest-integration-guide/): it batches events per table and transform, compresses requests, retries rate-limited requests while slowing down the pipeline, and reports events that Hydrolix rejects.

## Prepare Hydrolix

Hydrolix needs a table and a **transform** before it accepts events. A transform is the write schema of a table: it declares the columns, their types, and how to extract them from incoming events.

1. Create a project and a table, for example `security.events`, as the Hydrolix guide on [projects and tables](https://docs.hydrolix.io/latest/self-managed/advanced-configuration/projects-tables/projects-and-tables/) describes.

2. Create a transform for the table that reads JSON. The transform must declare a primary timestamp. Tenzir renders `time` values as RFC 3339 strings in UTC with as many fractional digits as needed, which the Go layout in the following transform accepts:

   ```json
   {
     "name": "tenzir",
     "type": "json",
     "settings": {
       "is_default": true,
       "compression": "none",
       "output_columns": [
         {
           "name": "time",
           "datatype": {
             "type": "datetime",
             "primary": true,
             "format": "2006-01-02T15:04:05.999999999Z07:00",
             "resolution": "ms"
           }
         },
         {
           "name": "class_uid",
           "datatype": { "type": "uint32" }
         },
         {
           "name": "severity_id",
           "datatype": { "type": "uint8" }
         },
         {
           "name": "src_ip",
           "datatype": {
             "type": "ip",
             "source": { "from_json_pointers": ["/src_endpoint/ip"] }
           }
         },
         {
           "name": "message",
           "datatype": { "type": "string" }
         }
       ]
     }
   }
   ```

   Keep `compression` at `none`. Tenzir compresses requests with gzip at the HTTP level, and Hydrolix decompresses them before it applies the transform. Publish the transform as the Hydrolix guide on [publishing transforms](https://docs.hydrolix.io/latest/self-managed/advanced-configuration/transforms-and-write-schema/transform-structure/publishing-your-transform/) describes.

3. Issue a [service account token](https://docs.hydrolix.io/latest/self-managed/advanced-configuration/authentication-and-authorization/account-types/service-accounts-howto/) with the `ingest_table` permission on the project or table. Service account tokens are valid for 365 days by default, whereas user tokens expire after 24 hours.

4. Store the token as a [secret](../explanations/secrets.md) named `hydrolix-token`, so that the pipeline doesn’t contain it in plain text.

## Send events

Pass the URL of your cluster, the table, and the token to [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md):

```tql
subscribe "ocsf"
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table="security.events",
  transform="tenzir"
```

If you omit `transform`, Hydrolix uses the default transform of the table, which is why the transform in the preceding example sets `is_default`. A table without a default transform rejects such requests.

## Shape events for the transform

A transform extracts the fields that it declares and assigns the remaining fields to a catch-all column if it has one. Shape events with TQL so that their fields match the transform. In particular, normalize the timestamps of all sources to the one primary timestamp field of the table:

```tql
subscribe "zeek"
time = move ts
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table="security.zeek"
```

If the transform doesn’t match the events, Hydrolix accepts the matching events and rejects the rest with HTTP 207. The operator then emits a warning with the number of rejected events and the reasons that Hydrolix reports.

## Route events to multiple tables

Hydrolix requires every request to target a single table and transform. The `table` and `transform` arguments of [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md) can be expressions, and the operator batches events for each destination separately. This sends every OCSF event class to a table of its own:

```tql
subscribe "ocsf"
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table=f"ocsf.{class_name.replace(" ", "_").to_lower()}"
```

## Isolate workloads with intake pools

Hydrolix can route requests to a dedicated set of intake heads, an **intake pool**, to isolate tenants or prioritize data. Depending on how your cluster routes traffic, use the hostname of the pool as URL or set the header that selects the pool. This example assumes a cluster that selects pools with a custom `X-Hdx-Intake-Pool` header:

```tql
subscribe "alerts"
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table="security.alerts",
  headers={"X-Hdx-Intake-Pool": "alerts"}
```

## Handle backpressure and failures

When Hydrolix is under load, it answers with HTTP 429. The operator keeps the batch, retries it with exponential backoff for at least 5 minutes, and stops taking new events while all request slots are busy, so the pipeline slows down instead of buffering without bounds. If Hydrolix still doesn’t accept the batch, or rejects a request because of invalid credentials or a missing table, the pipeline fails rather than dropping events silently.

The [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md) reference describes the [error handling](../reference/operators/to_hydrolix.md#error-handling) in detail.

## Read events

[`from_hydrolix`](https://tenzir.com/docs/reference/operators/from_hydrolix.md) currently reads through the native interface of the Hydrolix query engine, on port 9440 with TLS. It takes the same URL as [`to_hydrolix`](https://tenzir.com/docs/reference/operators/to_hydrolix.md). For the token, create a second service account with the `select_sql` permission on the tables that you read, so that each pipeline has only the permissions that it needs, and store its token as a secret named `hydrolix-read-token`.

Hydrolix partitions every table by its primary timestamp, so restrict reads to a time range. Production clusters almost always require one. When you read a `table`, the [`where`](https://tenzir.com/docs/reference/operators/where.md), [`select`](https://tenzir.com/docs/reference/operators/select.md), and [`head`](https://tenzir.com/docs/reference/operators/head.md) operators that follow become part of the query, as do many summaries with `count`, `min`, and `max`, and Hydrolix reads only the partitions and columns that the pipeline needs. The [`from_hydrolix`](https://tenzir.com/docs/reference/operators/from_hydrolix.md) reference lists the exact rules. Bind the start of the time range with `let`, so that it’s a constant that the [`where`](https://tenzir.com/docs/reference/operators/where.md) can pass to Hydrolix:

```tql
let $since = now() - 1h
from_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-read-token"),
  table="security.events"
where time > $since and severity_id >= 4
select time, class_uid, src_ip, message
```

Use `sql` for queries that `table` mode doesn’t express, such as sorting or [Hydrolix query options](https://docs.hydrolix.io/latest/exploring-data/query-interfaces/query-options-1/query-options-reference/):

```tql
from_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-read-token"),
  sql="SELECT * FROM security.events WHERE time > now() - INTERVAL 1 HOUR ORDER BY time DESC LIMIT 100"
```

## See also

* [Send to destinations](../guides/route/send-to-destinations.md)
* [Secrets](../explanations/secrets.md)
