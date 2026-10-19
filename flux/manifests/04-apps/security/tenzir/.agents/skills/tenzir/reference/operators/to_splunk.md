---
title: "to_splunk"
canonical: https://tenzir.com/docs/reference/operators/to_splunk
source: https://tenzir.com/docs/reference/operators/to_splunk.md
section: "Docs"
---

# to_splunk

> Sends events to a Splunk HTTP Event Collector (HEC).

Sends events to a Splunk [HTTP Event Collector (HEC)](https://docs.splunk.com/Documentation/Splunk/9.3.1/Data/UsetheHTTPEventCollector).

```tql
to_splunk url:string, hec_token=string,
          [event=any, raw=string, host=string, source=string,
          sourcetype=expr, index=expr, time=expr, fields=record,
          queue=string, include_nulls=bool, max_content_length=int,
          buffer_timeout=duration, parallel=int, compress=bool, tls=record]
```

## Description

The `to_splunk` operator sends events to a Splunk [HTTP Event Collector (HEC)](https://docs.splunk.com/Documentation/Splunk/9.3.1/Data/UsetheHTTPEventCollector).

By default, the operator sends events to the HEC event endpoint, renders incoming events as JSON, and uses the `_json` source type. Use `raw=...` to send raw string events to the HEC raw endpoint.

The operator accumulates multiple events before sending them as a single message to the HEC endpoint. You can control the maximum message size via the `max_content_length` and the timeout before sending all accumulated events via the `buffer_timeout` option.

### `url: string`

The address of the Splunk indexer.

### `hec_token = string`

The [HEC token](https://docs.splunk.com/Documentation/Splunk/9.3.1/Data/UsetheHTTPEventCollector#Create_an_Event_Collector_token_on_Splunk_Cloud_Platform) for authentication.

### `event = any (optional)`

The event to send.

This can be any value that Tenzir can render as JSON. The operator sends it in the `event` key of the top-level HEC envelope to `/services/collector/event`.

Defaults to `this`, meaning the entire incoming event is sent.

This option is mutually exclusive with `raw`.

### `raw = string (optional)`

The raw event text to send.

When set, `to_splunk` sends plain string events to `/services/collector/raw`. The `raw` expression must evaluate to a `string`. The operator separates multiple events in one request with newlines.

This option is mutually exclusive with `event`.

### `host = string (optional)`

An optional value for the [Splunk `host`](https://docs.splunk.com/Splexicon:Host).

### `source = string (optional)`

An optional value for the [Splunk `source`](https://docs.splunk.com/Splexicon:Source).

### `sourcetype = expr (optional)`

An optional expression for [Splunk’s `sourcetype`](https://docs.splunk.com/Splexicon:Sourcetype) that evaluates to a `string`. You can use this to set the `sourcetype` per event, by providing a field instead of a string.

Defaults to `_json`.

### `index = expr (optional)`

An optional expression for the [Splunk `index`](https://docs.splunk.com/Splexicon:Index) that evaluates to a `string`.

If you do not provide this option, Splunk will use the default index.

Note that HEC silently drops events with an invalid `index`.

### `time = expr (optional)`

An optional expression for the event timestamp.

The expression can evaluate to a Tenzir `time` or a non-negative numeric epoch timestamp in seconds. Strings are not accepted. If the expression evaluates to an invalid value for a row, the operator emits a warning and omits `time` for that row or raw request.

When you send HEC event envelopes, the timestamp becomes the top-level HEC `time` field for each event. With `raw=...`, the timestamp becomes a request-level query parameter for the raw endpoint.

### `fields = record (optional)`

An optional expression for indexed HEC fields. This option is not supported with `raw=...`.

The expression must evaluate to a flat record whose values are strings or lists of strings. Invalid field values are omitted with a warning. The fields are sent as top-level HEC `fields` metadata and are not copied into the event payload.

### `queue = string (optional)`

The Splunk processing queue to send events to.

Set this option to one of the following values:

* `indexing`: Use Splunk’s default HEC event path to the `indexQueue`.
* `typing`: Send events to Splunk’s `parsingQueue` so Splunk can apply parsing and source type rules before indexing.

Defaults to `indexing`.

This option is only supported with the HEC event endpoint. When you set `raw=...`, Splunk sends raw HEC requests to the indexer queue, and `queue="typing"` is rejected.

The `queue` field is non-standard HEC metadata that uses Splunk pipeline queue names. It is not part of the fully documented Splunk HEC event parameter set, so behavior can depend on the receiver. The operator omits the field for `queue="indexing"` because this is the Splunk HEC default. Vanilla Splunk HEC can reject `queue="typing"` requests with `No data`; use this option only with receivers that support the hint.

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

### `max_content_length = int (optional)`

The maximum size of the message uncompressed body in bytes. A message may consist of multiple events. If a single event is larger than this limit, it is dropped and a warning is emitted.

This corresponds with Splunk’s [`max_content_length`](https://docs.splunk.com/Documentation/Splunk/9.3.1/Admin/Limitsconf#.5Bhttp_input.5D) option. Be aware that [Splunk Cloud has a default of `1MB`](https://docs.splunk.com/Documentation/SplunkCloud/9.2.2406/Service/SplunkCloudservice#Using_HTTP_Event_Collector_.28HEC.29) for `max_content_length`.

Defaults to `5Mi`.

### `buffer_timeout = duration (optional)`

The maximum amount of time for which the operator accumulates messages before sending them out to the HEC endpoint as a single message.

Defaults to `5s`.

### `parallel = int (optional)`

The maximum number of concurrent requests per operator instance. Values greater than `1` let the operator send the next message before the HEC endpoint responded to the previous one, at the cost of the endpoint no longer receiving messages in the order the operator produced them. Set `parallel=1` to send one request at a time.

Defaults to `8`. Must be at least `1`.

### `compress = bool (optional)`

Whether to compress the message body using standard gzip.

Defaults to `true`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_splunk` accumulates its own messages and sends them with its own HEC token and connection. Because `parallel` bounds the requests in flight within one instance, the pipeline-wide bound is `parallel` times the number of instances.

HEC indexes every request on its own and gives no ordering guarantee across requests, so the indexer never sees a strict pipeline order once more than one request is in flight.

## Examples

### Send a JSON file to a HEC endpoint

```tql
from_file "example.json" {
  read_json
}
to_splunk "https://localhost:8088", hec_token=secret("splunk-hec-token")
```

### Set the Splunk event time

```tql
from {
  message: "login succeeded",
  observed_at: 2026-04-24T08:30:00Z,
}
to_splunk "https://localhost:8088",
  hec_token=secret("splunk-hec-token"),
  time=observed_at
```

### Add indexed HEC fields

```tql
from {
  message: "login succeeded",
  user: "alice",
  tags: ["prod", "vpn"],
}
to_splunk "https://localhost:8088",
  hec_token=secret("splunk-hec-token"),
  event={message: message},
  fields={user: user, tags: tags}
```

### Send events to the typing queue

```tql
from {
  message: "login succeeded",
}
to_splunk "https://localhost:8088",
  hec_token=secret("splunk-hec-token"),
  event={message: message},
  queue="typing"
```

### Send raw events

```tql
from {
  line: "Apr 24 08:30:00 host sshd[123]: Accepted publickey for alice",
  source: "secure.log",
}
to_splunk "https://localhost:8088",
  hec_token=secret("splunk-hec-token"),
  raw=line,
  source=source,
  sourcetype="linux_secure"
```

Raw endpoint metadata such as `host`, `source`, `sourcetype`, `index`, and `time` applies to the whole HEC request. When one of these values changes, the operator flushes the current request and starts a new one.

### Data-Dependent Splunk Framing

By default, the `to_splunk` operator sends the entire event as the `event` field to the HEC, together with any optional Splunk “frame” fields such as `host`, `source`, `sourcetype`, and `index`. Set these special properties with the operator’s respective arguments, using an expression that is evaluated per event.

However, this means that these special properties may be transmitted as both part of `event` and as part of the Splunk frame. This can be especially undesirable when the events are supposed to adhere to a specific schema, such as OCSF.

In this case, you can specify the additional `event` option to specify which part of the incoming event should be sent as the event.

```tql
from {
  host: "my-host",
  source: "my-source",
  a: 42,
  b: 0,
  message: "text",
  nested: { x: 0 },
}


// move the entire event into `event`
this = { event: this }


// hoist the Splunk-specific fields back out, so they are no longer part of the
// sent event
host = move event.host
source = move event.source


to_splunk "https://localhost:8088",
  hec_token=secret("splunk-hec-token"),
  host=host,
  source=source,
  event=event
```

## See Also

* [Map to CIM](../../guides/normalize/map-to-cim.md)
* [Splunk](../../integrations/splunk.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
