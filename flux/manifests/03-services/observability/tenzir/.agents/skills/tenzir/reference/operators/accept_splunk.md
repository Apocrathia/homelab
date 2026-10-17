---
title: "accept_splunk"
canonical: https://tenzir.com/docs/reference/operators/accept_splunk
source: https://tenzir.com/docs/reference/operators/accept_splunk.md
section: "Docs"
---

# accept_splunk

> Receives events through a Splunk HTTP Event Collector (HEC) endpoint.

Receives events through a Splunk HTTP Event Collector (HEC) endpoint.

```tql
accept_splunk [endpoint:string], hec_token=string,
  [max_request_size=int, max_connections=int, ack=bool,
   max_pending_acks=int, ack_timeout=duration, tls=record]
```

## Description

The `accept_splunk` operator starts a HEC-compatible HTTP server. It supports the event, raw, and health endpoints, including their `/1.0` aliases. Event requests can contain concatenated JSON envelopes or an array of envelopes. Requests may use gzip compression.

The operator validates the complete request before it emits any events. A successful response means that Tenzir accepted every event into the pipeline. It doesn’t mean that a downstream destination stored the events.

You can enable the HEC acknowledgement protocol with `ack=true`. The response to each accepted event request then contains an `ackId`. Clients query the status at `/services/collector/ack` with the same HEC token and request channel. The status becomes `true` after a checkpoint containing the complete request commits. Until pipeline checkpointing is enabled, acknowledgement statuses remain `false`.

### `endpoint: string (optional)`

The address on which the HEC server listens.

Defaults to `0.0.0.0:8088`, the standard HEC port. An `https://` endpoint requires a TLS record with a server certificate:

```tql
accept_splunk "https://0.0.0.0:8088",
  hec_token=secret("splunk-hec-token"),
  tls={certfile: "server.crt", keyfile: "server.key"}
```

### `hec_token = string`

The HEC token that authenticates requests. Store the token as a Tenzir secret:

```tql
hec_token=secret("splunk-hec-token")
```

Clients must send the token through the canonical header:

```http
Authorization: Splunk <token>
```

The operator doesn’t support Basic or query-string authentication.

### `max_request_size = int (optional)`

The maximum request body size after decompression.

Defaults to `10Mi`.

### `max_connections = int (optional)`

The maximum number of concurrent HTTP requests. Requests wait for an available slot when the limit is reached.

Defaults to `10`.

### `ack = bool (optional)`

Enables the HEC acknowledgement protocol. When enabled, every event and raw request must provide a UUID-formatted channel in the `X-Splunk-Request-Channel` header or the `channel` query parameter. The operator canonicalizes equivalent UUID spellings before matching channels.

Defaults to `false`. The `/services/collector/ack` endpoint returns `ACK is disabled` while acknowledgements are disabled.

### `max_pending_acks = int (optional)`

The maximum number of acknowledgement IDs retained for checkpointing and client queries. The server rejects new event requests with `503 Server is busy` after it reaches the limit.

Defaults to `1000000`.

### `ack_timeout = duration (optional)`

The time to retain an acknowledgement ID. Ready IDs continue to return `true` throughout this period, making repeated queries safe if an HTTP response is lost. Expired IDs return `false` and no longer count towards `max_pending_acks`.

Defaults to `10min`.

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

## Output

Event requests emit one `splunk.hec.event` event for each HEC envelope. The `time` field accepts a numeric epoch or an epoch in a string. The operator preserves the envelope, including unknown top-level metadata, and adds the client address and optional HEC channel under `receiver`:

```tql
{
  event: {
    message: "login succeeded",
    user: "alice",
  },
  time: 2026-04-24T08:30:00Z,
  host: "vpn-01",
  source: "secure.log",
  sourcetype: "linux_secure",
  index: "main",
  fields: {
    environment: "prod",
  },
  receiver: {
    peer_ip: 192.0.2.1,
    channel: "00872DC6-AC83-4EDE-8AFE-8413C3825C4C",
  },
}
```

If an envelope already contains a `receiver` field, the operator preserves the client-provided value and doesn’t add connection metadata to that event.

Raw requests emit one `splunk.hec.raw` event. The `raw` field contains the complete request body as a blob. The operator doesn’t split raw input on newlines because Splunk applies source type-specific line-breaking rules. Request query parameters become HEC metadata fields.

```tql
{
  raw: b"Apr 24 08:30:00 vpn-01 sshd[123]: Accepted publickey for alice\n",
  host: "vpn-01",
  source: "secure.log",
  sourcetype: "linux_secure",
  index: "main",
  receiver: {
    peer_ip: 192.0.2.1,
    channel: "00872DC6-AC83-4EDE-8AFE-8413C3825C4C",
  },
}
```

The raw endpoint requires a UUID-formatted HEC channel in the `X-Splunk-Request-Channel` header or the `channel` query parameter.

## Examples

### Receive HEC events

```tql
accept_splunk hec_token=secret("splunk-hec-token")
publish "splunk"
```

Configure the exporter to send HEC requests to port `8088` on the Tenzir node.

### Receive events with acknowledgements

```tql
accept_splunk hec_token=secret("splunk-hec-token"), ack=true
publish "splunk"
```

Configure the exporter to use a stable UUID as its HEC request channel and to poll `/services/collector/ack`. An acknowledgement covers the complete HTTP request, including every event in a batch.

### Replace a HEC listener on port 9880

Keep the old port while you update clients:

```tql
accept_splunk "0.0.0.0:9880",
  hec_token=secret("splunk-hec-token")
publish "splunk"
```

## See also

* [Splunk](../../integrations/splunk.md)
