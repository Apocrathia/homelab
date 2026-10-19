---
title: "to_hydrolix"
canonical: https://tenzir.com/docs/reference/operators/to_hydrolix
source: https://tenzir.com/docs/reference/operators/to_hydrolix.md
section: "Docs"
---

# to_hydrolix

> Sends events to the Hydrolix HTTP streaming ingest API.

Sends events to the [Hydrolix](https://hydrolix.io) HTTP streaming ingest API.

```tql
to_hydrolix url:string, table=string, token=string,
            [transform=string, table_token=string, headers=record,
            include_nulls=bool, max_content_length=int,
            buffer_timeout=duration, parallel=int, compress=bool, tls=record]
```

## Description

The `to_hydrolix` operator sends events to the `/ingest/event` endpoint of the [Hydrolix HTTP Stream API](https://docs.hydrolix.io/latest/self-managed/load-data/streaming-ingest/streaming-http/). Hydrolix stores each event in the table that `table` names and applies a **transform**, its write schema, to map the event to the columns of that table.

The operator renders events as JSON and batches them per destination, the combination of table and transform. It sends a batch as a single request once the batch reaches `max_content_length` or after `buffer_timeout`, whichever comes first. Hydrolix recommends about 1 MB of uncompressed data per request, which is the default.

Across all destinations, the operator buffers at most 16 times `max_content_length`. When `table` or `transform` yield many distinct values, batches rarely fill up, so the operator sends the oldest batches early once it reaches this limit.

The project, table, and transform must exist before you send events. The transform must read JSON and set its `compression` setting to `none`, whether or not you set `compress=false`. With `compress=true`, Hydrolix decompresses the request at the HTTP level before it applies the transform, and with `compress=false`, the request is plain JSON. A transform that decompresses the data itself rejects both.

If you omit `transform`, the table needs a default transform. Without one, Hydrolix expects each request to carry its own transform and rejects the events with an error like `cannot unmarshal object into Go value of type intake.DescribedJSONValueArray`.

### Timestamps

Every Hydrolix table has a primary timestamp. Tenzir renders `time` values as RFC 3339 strings in UTC, such as `2026-03-11T14:30:00.123Z`, with as many fractional digits as needed. Declare the primary timestamp in the transform with a format that accepts this representation:

```json
{
  "name": "time",
  "datatype": {
    "type": "datetime",
    "primary": true,
    "format": "2006-01-02T15:04:05.999999999Z07:00",
    "resolution": "ms"
  }
}
```

### Error handling

The operator handles the responses of Hydrolix as follows:

* **Success (HTTP 200)**: The operator continues with the next batch.
* **Partial success (HTTP 207)**: Hydrolix accepted some events and rejected others, which usually means that the transform doesn’t match the events. The operator emits a warning with the number of rejected events and the reasons that Hydrolix reports, and continues.
* **Rate limiting (HTTP 429), server errors (HTTP 5xx), and network failures**: The operator keeps the batch and retries it with exponential backoff, starting at 1 second and honoring the `Retry-After` header. It keeps retrying for at least 5 minutes before it fails the pipeline. While a batch waits for a retry, it occupies one of the `parallel` request slots, so a struggling Hydrolix cluster slows down the pipeline instead of building up an unbounded backlog.
* **Client errors (HTTP 4xx)**: The operator fails the pipeline, because retrying a malformed or unauthorized request can’t succeed.

Hydrolix doesn’t deduplicate events. If a request times out after Hydrolix accepted it, the retry stores the events a second time.

Diagnostics show the responses of Hydrolix without the token, the table token, and header values from secrets, even if Hydrolix repeats them.

### `url: string`

The URL of the Hydrolix cluster, for example `https://acme.hydrolix.live`. It must contain a host and use the `http` or `https` scheme, if any.

The operator appends the path `/ingest/event` unless the URL already ends with it. To route events to a dedicated intake pool, use the hostname of that pool.

The URL must not contain the `table`, `transform`, or `token` query parameters, because Hydrolix would prefer them over the destination of each batch. Use the `table`, `transform`, and `table_token` arguments instead.

### `table = string`

The project and table that receive the events, in the form `project.table`.

This can be an expression that evaluates per event, so that one pipeline can route events to multiple tables. The operator skips events whose `table` is `null`, contains control characters, or lacks the `project.table` form, with exactly one dot between a non-empty project and table name, and emits a warning. Hydrolix rejects such names, because the `X-Hdx-Table` header can’t distinguish a dot in a name from the separator.

### `token = string`

The bearer token for authentication, typically a [service account token](https://docs.hydrolix.io/latest/self-managed/advanced-configuration/authentication-and-authorization/account-types/service-accounts-howto/). The account of the token needs the `ingest_table` permission on the tables that receive the events.

If the token is a JWT with an expiration date, the operator checks it on startup. It fails if the token already expired and warns if the token expires within 7 days.

### `transform = string (optional)`

The name of the transform that Hydrolix applies to the events.

This can be an expression that evaluates per event. If you omit `transform` or it evaluates to `null`, Hydrolix uses the default transform of the table. The operator skips events whose `transform` contains control characters, and emits a warning.

### `table_token = string (optional)`

A [table access token](https://docs.hydrolix.io/latest/self-managed/load-data/streaming-ingest/table-access-tokens/) for tables that require one. The operator sends it in the `X-Hdx-Token` header.

### `headers = record (optional)`

Additional HTTP headers to send with every request, such as `X-Hdx-Project` or a custom header that selects an intake pool. Each value is resolved as a [secret](../../explanations/secrets.md).

You can’t set the headers that the operator manages: `Authorization`, `Content-Encoding`, `Content-Length`, `Content-Type`, `X-Hdx-Table`, `X-Hdx-Token`, and `X-Hdx-Transform`.

### `include_nulls = bool (optional)`

Include fields with null values in the transmitted events. By default, the operator drops all null values to save space. Hydrolix treats a missing field like a null value.

### `max_content_length = int (optional)`

The maximum size of the uncompressed request body in bytes. A request may consist of multiple events. If a single event is larger than this limit, the operator drops it and emits a warning.

This limit also determines the memory that the operator uses for buffering: at most 16 times `max_content_length` across all destinations.

Defaults to `1Mi`.

### `buffer_timeout = duration (optional)`

The maximum amount of time for which the operator accumulates events of a destination before sending them as a single request.

Defaults to `5s`.

### `parallel = int (optional)`

The maximum number of concurrent requests per operator instance. Values greater than `1` let the operator send the next request before Hydrolix responded to the previous one. Set `parallel=1` to send one request at a time.

Defaults to `8`. Must be at least `1`.

### `compress = bool (optional)`

Whether to compress the request body with gzip.

Defaults to `true`.

### `tls = record (optional)`

TLS configuration. Provide an empty record (`tls={}`) to enable TLS with defaults or set fields to customize it.

```tql
{
  skip_peer_verification: bool, // skip certificate verification.
  cacert: string,               // CA bundle to verify peers.
  certfile: string,             // client certificate to present.
  keyfile: string,              // private key for the client certificate.
  min_version: string,          // minimum TLS version (`"1.0"`, `"1.1"`, `"1.2"`, "1.3"`).
  ciphers: string,              // OpenSSL cipher list string.
  client_ca: string,            // CA to validate client certificates.
  require_client_cert: bool,    // require clients to present a certificate.
}
```

The `client_ca` and `require_client_cert` options are only valid for operators that accept incoming client connections.

Any value not specified in the record will either be picked up from the configuration or if not configured will not be used by the operator.

See the [Node TLS Setup guide](../../guides/node-setup/configure-tls.md) for more details.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_hydrolix` batches its own events and sends them over its own connections. Because `parallel` bounds the requests in flight within one instance, the pipeline-wide bound is `parallel` times the number of instances.

Hydrolix ingests every request on its own and gives no ordering guarantee across requests.

## Examples

### Send events to a table

```tql
subscribe "suricata"
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table="security.suricata",
  transform="suricata"
```

### Route events to a table per OCSF class

```tql
subscribe "ocsf"
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table=f"ocsf.{class_name.replace(" ", "_").to_lower()}"
```

Each table uses its default transform because the example omits `transform`.

### Send events to a table that requires an access token

```tql
subscribe "alerts"
to_hydrolix "https://acme.hydrolix.live",
  token=secret("hydrolix-token"),
  table="security.alerts",
  table_token=secret("hydrolix-alerts-table-token"),
  headers={"X-Hdx-Project": "security"}
```

## See Also

* [`from_hydrolix`](https://tenzir.com/docs/reference/operators/from_hydrolix.md)
* [Hydrolix](../../integrations/hydrolix.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
