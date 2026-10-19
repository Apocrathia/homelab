---
title: "to_elasticsearch"
canonical: https://tenzir.com/docs/reference/operators/to_elasticsearch
source: https://tenzir.com/docs/reference/operators/to_elasticsearch.md
section: "Docs"
---

# to_elasticsearch

> Sends events to a Bulk API compatible with Elasticsearch.

Sends events to a Bulk API compatible with Elasticsearch.

```tql
to_elasticsearch url:string, action=string, [index=string, id=string, doc=record,
  user=string, passwd=string, tls=record, include_nulls=bool,
  max_content_length=int, buffer_timeout=duration, parallel=int,
  compress=bool]
```

## Description

The `to_elasticsearch` operator sends events to a [Bulk API compatible with Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html). The same implementation also works with Bulk API endpoints compatible with OpenSearch.

You can also use [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) as an alias.

The operator appends `/_bulk` to the URL if the path doesn’t already end with `/_bulk`. It accumulates multiple events before sending them as a single request. You can control the maximum request size with `max_content_length` and the timeout before sending accumulated events with `buffer_timeout`.

### `url: string`

The URL of the API endpoint.

### `action = string`

An expression for the action that evaluates to a `string`.

Supported actions:

* `create`: Creates a document if it doesn’t already exist and returns an error otherwise.
* `delete`: Deletes a document if it exists.
* `index`: Creates a document if it doesn’t exist yet and replaces the document if it already exists.
* `update`: Updates existing documents and returns an error if the document doesn’t exist.
* `upsert`: Updates a document if it exists, or indexes a new document if it doesn’t exist.

### `index = string (optional)`

An optional expression for the index that evaluates to a `string`.

Must be provided if the `url` does not have an index.

### `id = string (optional)`

The `id` of the document to act on.

Must be provided when using the `delete`, `update`, and `upsert` actions.

### `doc = record (optional)`

The document to serialize.

Defaults to `this`.

### `user = string (optional)`

Optional user for HTTP Basic Authentication.

### `passwd = string (optional)`

Optional password for HTTP Basic Authentication.

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

### `include_nulls = bool (optional)`

Include fields with null values in the transmitted event data. By default, the operator drops all null values to save space.

Defaults to `false`.

### `max_content_length = int (optional)`

The maximum size of the uncompressed message body in bytes. A message may consist of multiple events. If a single event is larger than this limit, the operator drops it and emits a warning.

Defaults to `5Mi`.

### `buffer_timeout = duration (optional)`

The maximum amount of time for which the operator accumulates events before sending them to the Bulk API as a single request.

Defaults to `5s`.

### `parallel = int (optional)`

The maximum number of concurrent requests per operator instance. Values greater than `1` let the operator send the next request before the Bulk API responded to the previous one, at the cost of the endpoint no longer receiving requests in the order the operator produced them. Set `parallel=1` to send one request at a time.

Defaults to `8`. Must be at least `1`.

### `compress = bool (optional)`

Whether to compress the message body using standard gzip.

Defaults to `true`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_elasticsearch` accumulates its own events and sends them over its own connection. Because `parallel` bounds the requests in flight within one instance, the pipeline-wide bound is `parallel` times the number of instances.

The Bulk API applies every request on its own and gives no ordering guarantee across requests. Documents that repeatedly update the same `id` may therefore end up in a different final state than the pipeline order suggests, both with `parallel` greater than `1` and with parallelism enabled.

## Examples

### Send events from a JSON file

```tql
from_file "example.json"
to_elasticsearch "localhost:9200", action="create", index="main"
```

## See Also

* [`accept_elasticsearch`](https://tenzir.com/docs/reference/operators/accept_elasticsearch.md)
* [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md)
* [Map to ECS](../../guides/normalize/map-to-ecs.md)
* [Elasticsearch](../../integrations/elasticsearch.md)
* [OpenSearch](../../integrations/opensearch.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
