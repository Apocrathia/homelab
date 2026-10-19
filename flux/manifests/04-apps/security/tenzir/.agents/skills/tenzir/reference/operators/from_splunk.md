---
title: "from_splunk"
canonical: https://tenzir.com/docs/reference/operators/from_splunk
source: https://tenzir.com/docs/reference/operators/from_splunk.md
section: "Docs"
---

# from_splunk

> Runs a Splunk search and returns its results as events.

Runs a Splunk search and returns its results as events.

```tql
from_splunk url:string, search=string, earliest=string|time, latest=string|time,
            headers=record, [options=record, tls=record, timeout=duration,
            connection_timeout=duration, max_retry_count=int,
            retry_delay=duration]
```

## Description

The `from_splunk` operator sends one search request to a Splunk Search Head and returns every search result as a Tenzir event. Tenzir initiates the connection to Splunk. Splunk doesn’t need outbound network access to Tenzir.

For each invocation, the operator sends a form-encoded `POST` request to the Splunk management API endpoint `/services/search/v2/jobs/export`. It requests final JSON results and streams them into the pipeline without buffering the complete response. The export endpoint returns one streamed HTTP response, so the operator doesn’t issue pagination requests. Splunk envelope fields such as `preview`, `offset`, and `lastrow` aren’t included in the output.

The operator preserves the fields inside each Splunk `result` record and assigns the schema name `tenzir.splunk` to the resulting events. It infers Tenzir types from supported string representations, but doesn’t parse `_raw` or normalize field names.

Splunk `ERROR` and `FATAL` response messages fail the pipeline. The diagnostic includes Splunk’s message and the submitted SPL query. Splunk `WARN` messages produce Tenzir warnings without discarding valid search results.

### `url: string`

The Splunk Search Head management URL. Splunk Enterprise uses port `8089` for the management API by default.

For Splunk Cloud Platform, use `https://<deployment-name>.splunkcloud.com:8089`. Your deployment must permit REST API access from the Tenzir egress IP address. You can configure the search API IP allowlist through the Admin Config Service or ask Splunk Support to open port `8089`. Splunk Cloud Platform free trials don’t provide REST API access. See the [Splunk Cloud Platform REST API requirements](https://help.splunk.com/en-gb/splunk-enterprise/leverage-rest-apis/rest-api-tutorials/9.1/rest-api-tutorials/access-requirements-and-limitations-for-the-splunk-cloud-platform-rest-api).

### `search = string`

The Splunk Search Processing Language (SPL) query to run.

The Splunk account must have permission to run the query and read every index that the query accesses.

An ordinary search copied from Splunk Web, such as `index=main`, must begin with the `search` command when you submit it through the REST API. Generating commands usually begin with `|` and don’t need the prefix.

Use a [raw string](../expressions.md#string) when the SPL query contains quotes:

```tql
search=r#"search index=main user="Jane Doe" | eval label="login event""#
```

Use a [format string](../expressions.md#format-strings-f-strings) to include TQL variables in the query. Escape quotes that belong to the resulting SPL query:

```tql
let $index = "main"
let $user = "Jane Doe"


from_splunk "https://splunk-search-head.example.com:8089",
  search=f"search index={$index} user=\"{$user}\"",
  earliest="-15m",
  latest="-5m",
  headers={
    Authorization: secret("splunk-rest-authorization"),
  }
```

### `earliest = string|time`

The inclusive lower time boundary for the search. Tenzir sends this value as Splunk’s `earliest_time` form field.

Pass a `time` value for an absolute UTC timestamp. For a string, you can use a UTC timestamp, a UNIX timestamp, or a [Splunk relative time expression](https://help.splunk.com/en/splunk-enterprise/search/search-manual/10.2/specify-time-ranges/specify-time-modifiers-in-your-search) such as `-15m` or `@d`.

### `latest = string|time`

The exclusive upper time boundary for the search. Tenzir sends this value as Splunk’s `latest_time` form field. It accepts the same values as `earliest`.

Specify both `earliest` and `latest` for every invocation. This prevents a recurring pipeline from accidentally running an unbounded search.

The operator rejects real-time bounds such as `rt`, `rt-5m`, and `rt@h`.

### `headers = record`

The HTTP headers to send with the request. The record must contain an `Authorization` header.

Store the complete header value as a Tenzir secret:

```tql
headers={
  Authorization: secret("splunk-rest-authorization"),
}
```

Set the secret to one of the authentication values that the Splunk management REST API accepts:

| Authentication              | Complete header value                |
| --------------------------- | ------------------------------------ |
| Splunk authentication token | `Bearer <authentication-token>`      |
| Splunk session key          | `Splunk <session-key>`               |
| HTTP Basic authentication   | `Basic <base64-encoded-credentials>` |

A Splunk HTTP Event Collector (HEC) token authenticates ingestion requests. It doesn’t authenticate search requests to the management REST API. See [Splunk REST API authentication](https://help.splunk.com/en/splunk-enterprise/leverage-rest-apis/rest-api-user-manual/9.0/rest-api-user-manual/basic-concepts-about-the-splunk-platform-rest-api) for details.

### `options = record (optional)`

Additional form parameters for Splunk’s [`search/v2/jobs/export` endpoint](https://help.splunk.com/en/splunk-cloud-platform/leverage-rest-apis/rest-api-reference/10.3.2512/search-endpoints/search-endpoint-descriptions#search-v2-jobs-export). Use a flat record. Tenzir form-encodes each field and includes it in the search request.

Common parameters include:

| Field            | Purpose                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `namespace`      | Selects the application namespace for macros, lookups, and other knowledge objects.   |
| `index_earliest` | Sets the inclusive lower boundary based on index time.                                |
| `index_latest`   | Sets the exclusive upper boundary based on index time.                                |
| `now`            | Anchors relative time expressions to one absolute time.                               |
| `max_time`       | Limits the Splunk search runtime in seconds. Use a positive value for a finite limit. |
| `enable_lookups` | Enables or disables lookup application.                                               |
| `rf`             | Adds one required field to the search.                                                |

Each option must contain one value. Tenzir rejects list values because the record-based `options` parameter can’t represent repeated form fields. For example, pass `rf: "host"` rather than `rf: ["host", "source"]`.

The `index_earliest` and `index_latest` fields accept the same absolute and relative time expressions as `earliest` and `latest`.

Tenzir owns `search`, `earliest_time`, `latest_time`, `output_mode`, and `preview`. The operator rejects these fields in `options`. It also rejects real-time settings, including `search_mode="realtime"`, `indexedRealtime`, and parameters whose names begin with `rt_`.

### `timeout = duration (optional)`

The timeout for the complete request.

Defaults to `90s`.

### `connection_timeout = duration (optional)`

The timeout for establishing the connection.

Defaults to `5s`.

### `max_retry_count = int (optional)`

The maximum number of retry attempts. Tenzir retries transient transport failures and HTTP `429` and `5xx` responses.

Defaults to `5`.

### `retry_delay = duration (optional)`

The base delay between retry attempts. The operator uses the same retry behavior as [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md): exponential backoff capped at `16 * retry_delay`. A `Retry-After` response header overrides the delay.

Defaults to `1s`.

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

To trust a private certificate authority, set `tls.cacert` to its CA bundle:

```tql
tls={cacert: "/etc/tenzir/splunk-ca.pem"}
```

## Examples

### Query authentication events

Assume Splunk already contains two authentication events under the source `tenzir-docs-auth`:

Events in Splunk

```tql
{_time: 2025-01-01T00:00:00Z, user: "alice", outcome: "success"}
{_time: 2025-01-01T00:01:00Z, user: "bob", outcome: "failure"}
```

Query the events and select the fields that the pipeline needs:

```tql
from_splunk "https://splunk-search-head.example.com:8089",
  search=r#"search index=main source="tenzir-docs-auth" | fields _time user outcome | sort 0 user"#,
  earliest="1735689599",
  latest="1735689780",
  headers={
    Authorization: secret("splunk-rest-authorization"),
  }
```

```tql
{_time: 2025-01-01T00:00:00Z, user: "alice", outcome: "success"}
{_time: 2025-01-01T00:01:00Z, user: "bob", outcome: "failure"}
```

Splunk renders `_time` as a JSON string in the search user’s time zone. Tenzir infers a `time` value when the string uses a supported timestamp format. This includes timestamps with `GMT`, `UTC`, `UT`, `Z`, or a numeric UTC offset.

Tenzir currently doesn’t parse named non-zero-offset zones such as `PDT`, `EST`, or `CET`. These abbreviations can be ambiguous, so `_time` remains a string when Splunk returns one of them. Format `_time` with a numeric offset in the SPL query to get a `time` value regardless of the search user’s time zone:

```tql
search=r#"search index=main | eval _time=strftime(_time, "%FT%T.%Q%:z")"#
```

For example, Splunk formats a UTC timestamp as `2025-01-01T00:00:00.000+00:00`, which Tenzir infers as a `time` value.

Splunk result fields such as `_raw`, `_bkt`, and `_indextime` are available unless the SPL query removes them. The operator always removes Splunk’s `preview`, `offset`, and `lastrow` export-envelope fields.

### Use Tenzir times as search boundaries

Pass `time` values directly when another part of the pipeline computes the search window. Tenzir serializes them as UTC strings for Splunk:

```tql
let $start = 2026-07-14T08:00:00Z
let $end = 2026-07-14T09:00:00Z


from_splunk "https://splunk-search-head.example.com:8089",
  search="search index=main sourcetype=linux_secure",
  earliest=$start,
  latest=$end,
  headers={
    Authorization: secret("splunk-rest-authorization"),
  }
```

### Collect recurring results by index time

Use Splunk index-time bounds to collect events that arrived late. This example runs every five minutes, accepts events with timestamps up to one day old, and uses a five-minute overlap between index-time windows:

```tql
every 5m {
  from_splunk "https://splunk-search-head.example.com:8089",
    search="search index=main sourcetype=linux_secure",
    earliest="-24h",
    latest="-5m",
    options={
      now: now().since_epoch().count_seconds().int(),
      index_earliest: "-15m",
      index_latest: "-5m",
      max_time: 60,
    },
    headers={
      Authorization: secret("splunk-rest-authorization"),
    }
}
publish "splunk-results"
```

The `now` parameter gives every relative boundary in one invocation the same anchor, including retries. Adjust the event-time window to the maximum delay that you accept. Overlapping index-time windows can return an event more than once. [Deduplicate events](../../guides/optimize/deduplicate-events.md) by a stable identifier when duplicates aren’t acceptable.

## Limitations

The operator runs one finite export request per invocation. It rejects real-time bounds and search parameters before sending the request. It doesn’t create search jobs, poll search IDs, manage saved searches, schedule requests, persist checkpoints, or deduplicate results. Scheduling and stateful processing belong in the surrounding pipeline.

## See also

* [`every`](https://tenzir.com/docs/reference/operators/every.md)
* [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)
* [`to_splunk`](https://tenzir.com/docs/reference/operators/to_splunk.md)
* [Splunk](../../integrations/splunk.md)
