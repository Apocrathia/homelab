---
title: "to_sentinelone_data_lake"
canonical: https://tenzir.com/docs/reference/operators/to_sentinelone_data_lake
source: https://tenzir.com/docs/reference/operators/to_sentinelone_data_lake.md
section: "Docs"
---

# to_sentinelone_data_lake

> Sends security events to SentinelOne Singularity Data Lake via REST API.

Sends security events to SentinelOne Singularity Data Lake via REST API.

```tql
to_sentinelone_data_lake url:string, token=string,
                         [session_info=record, timeout=duration, tls=record]
```

## Description

The `to_sentinelone_data_lake` operator sends incoming events to the [SentinelOne Data Lake REST API](https://support.sentinelone.com/hc/en-us/articles/360004195934-SentinelOne-API-Guide) as structured data, using the `addEvents` endpoint.

The operator accumulates multiple events before sending them as a single request, respecting the API’s limits.

If events are OCSF events, the `time` and `severity_id` fields are automatically extracted and added to the events meta information.

The OCSF `severity_id` is mapped to the SentinelOne Data Lake `sev` property according to this table:

| OCSF `severity_id` | SentinelOne severity |
| ------------------ | -------------------- |
| 0 (Unknown)        | 3 (info)             |
| 1 (Informational)  | 1 (finer)            |
| 2 (Low)            | 2 (fine)             |
| 3 (Medium)         | 3 (info)             |
| 4 (High)           | 4 (warn)             |
| 5 (Critical)       | 5 (error)            |
| 6 (Fatal)          | 6 (fatal)            |
| 99 (Other)         | 3 (info)             |

### `url: string`

The ingest URL for the Data Lake.

The URL must start with `https://`.

Please note that using the wrong ingestion endpoint, such as an incorrect region, may silently fail, as the SentinelOne API responds with 200 OK, even for some erroneous requests.

### `token = string`

The token to use for authorization.

### `session_info = record (optional)`

Some additional sessionInfo to send with each batch of events, as the `sessionInfo` field in the request body. If this option is used, it is recommended that it contains a field `serverHost` to identify the Node.

This can also contain a field `parser`, which names a SentinelOne parser that will be applied to the data field `message`. This can be used to ingest unstructured data.

### `timeout = duration (optional)`

The delay after which events are sent, even if this results in fewer events sent per message.

Defaults to `1min`.

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

For SentinelOne endpoints that use a private CA, set `tls={cacert: "/path/to/ca.pem"}`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_sentinelone_data_lake` batches, authenticates, and sends independently with its own connection pool. Each instance sends at most 16 concurrent requests, so the pipeline-wide bound is 16 times the number of instances.

The API ingests every request on its own and gives no ordering guarantee across requests.

## Examples

### Send events to SentinelOne Data Lake

```tql
to_sentinelone_data_lake "https://ingest.eu1.sentinelone.net",
  token=secret("sentinelone-token")
```

### Send additional session information

```tql
to_sentinelone_data_lake "https://ingest.eu1.sentinelone.net",
  token=secret("sentinelone-token"),
  session_info={
    serverHost: "Node 42",
    serverType: "Tenzir Node",
    region: "Planet Earth",
  }
```

### Send ‘unstructured’ data

The operator can also be used to send unstructured data to be parsed by SentinelOne. For this, the operators input must contain a field `message` and a `parser` must be specified in the `session_info`:

```tql
select message = this.print_ndjson();         // Format the entire event as JSON
to_sentinelone_data_lake "https://ingest.eu1.sentinelone.net",
  token=secret("sentinelone-token"),
  session_info={
    serverHost: "Node 42",
    parser: "json",                            // Have SentinelOne parse the data
  }
```

Ingest Costs

SentinelOne charges per ingested *value* byte in the events. This means that you get charged for all bytes in `message`, including the keys, structural elements and whitespace.

If you already have structured data in Tenzir, prefer sending structured data, as you will only be charged for the values and one byte per key, as opposed to the full keys and structural characters in `message`.

## See Also

* [`from_sentinelone_data_lake`](https://tenzir.com/docs/reference/operators/from_sentinelone_data_lake.md)
* [SentinelOne Data Lake](../../integrations/sentinelone-data-lake.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
