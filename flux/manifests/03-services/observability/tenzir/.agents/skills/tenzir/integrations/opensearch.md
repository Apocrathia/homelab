---
title: "OpenSearch integration"
description: "Search, analyze, and visualize data with a distributed, open-source platform."
canonical: https://tenzir.com/integrations/opensearch
source: https://tenzir.com/integrations/opensearch.md
section: "Integrations"
---

# OpenSearch integration

> Search, analyze, and visualize data with a distributed, open-source platform.

OpenSearch

[OpenSearch](https://opensearch.org) is a search and observability suite for unstructured data. Tenzir can send events to OpenSearch and emulate a OpenSearch-compatible Bulk API endpoint.

When sending data to OpenSearch, Tenzir uses the [Bulk API](https://opensearch.org/docs/latest/api-reference/document-apis/bulk/)and attempts to maximally batch events for throughput, accumulating multiple events before shipping them within a single API call. You can control batching behavior with the `max_content_length` and`buffer_timeout` options.

Use `to_opensearch` to send events to OpenSearch Bulk API endpoints. For more details, see the documentation for the [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) operator.

Tenzir can also present a OpenSearch-compatible REST API via the [`accept_opensearch`](https://tenzir.com/docs/reference/operators/accept_opensearch.md) operator.

## Examples

### Query documents from a OpenSearch index

Use [`from_http`](https://tenzir.com/docs/reference/operators/from_http.md)to query the [Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/). The Search API supports`GET` and `POST` requests to`/{index}/_search`. When you provide a request body,`from_http` uses `post` by default.

```tql
from_http "https://localhost:9200/main/_search",
  body={
    size: 100,
    query: {match_all: {}},
    sort: [{"@timestamp": {order: "desc"}}],
  } {
  read_json
}
unroll hits.hits
this = hits.hits._source
```

Add an `Authorization` header if your OpenSearch cluster requires authentication.

### Export large result sets with `search_after`

For larger exports, prefer `search_after` with a stable sort. Return a request record from `paginate` to replace the request body for each next page. The next request keeps the same URL, method, and headers unless the request record changes them.

Keep only the response parser inside the `from_http` subpipeline. Operators such as `unroll` belong after `from_http`, so the pagination lambda receives the whole search response envelope.

```tql
from_http "https://localhost:9200/main/_search",
  body={
    size: 1000,
    query: {match_all: {}},
    sort: [{"@timestamp": "asc"}, {"_id": "asc"}],
  },
  paginate=(x => {
    body: {
      size: 1000,
      query: {match_all: {}},
      sort: [{"@timestamp": "asc"}, {"_id": "asc"}],
      search_after: x.hits.hits[-1].sort,
    },
  } if x.hits.hits != []) {
  read_json
}
unroll hits.hits
this = hits.hits._source
```

Add an `Authorization` header if your OpenSearch cluster requires authentication.

### Export large result sets with scroll

Use the [Scroll API](https://docs.opensearch.org/latest/api-reference/search-apis/scroll/) when you need a server-side search context for a long-running export. Start with a search request that includes a `scroll` query parameter, then return a request record that switches the next URL to `/_search/scroll` and sends the latest`_scroll_id` in the body.

```tql
let $search = "https://localhost:9200/main/_search?scroll=10m"
let $scroll = "https://localhost:9200/_search/scroll"


from_http $search,
  body={
    size: 10000,
    query: {match_all: {}},
  },
  paginate=(x => {
    url: $scroll,
    body: {
      scroll: "10m",
      scroll_id: x._scroll_id,
    },
  } if x.hits.hits != []) {
  read_json
}
unroll hits.hits
this = hits.hits._source
```

The paginated request inherits the `POST` method from the initial request because the initial request has a body. It also keeps the configured headers. Close the scroll context when the export is complete, because OpenSearchkeeps the search context alive until the scroll timeout expires.

### Send events to a OpenSearch index

Send an example event to the `main` index:

```tql
from {event: "example"}
to_opensearch "1.2.3.4:9200", action="create", index="main"
```

Instead of treating the entire event as a document to be indexed by OpenSearch, you can designate a nested record as the document:

```tql
from {category: "qux", doc_id: "XXX", event: {foo: "bar"}}
to_opensearch "localhost:9200", id=doc_id, doc=event, action="update", index=category
```

The above example updates the document with ID `XXX` with the contents from the nested field `event`.

### Accept data by emulating OpenSearch

Tenzir can act as a drop-in replacement for OpenSearch by accepting data via a Bulk API endpoint. This allows you to point your [Logstash](https://opensearch.org/docs/latest/tools/logstash/index/) or Beats instances to Tenzir instead.

```tql
accept_opensearch "0.0.0.0:9200", keep_actions=true
publish "opensearch"
```

You can now configure a [Logstash output](https://opensearch.org/docs/latest/tools/logstash/ship-to-opensearch/) to use the emulated Bulk API endpoint.

## See Also

* [Fetch via HTTP and APIs](../guides/collect/fetch-via-http-and-apis.md)
* [Elasticsearch](elasticsearch.md)
