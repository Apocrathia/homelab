---
title: "accept_relp"
canonical: https://tenzir.com/docs/reference/operators/accept_relp
source: https://tenzir.com/docs/reference/operators/accept_relp.md
section: "Docs"
---

# accept_relp

> Receives Syslog messages over the Reliable Event Logging Protocol (RELP).

Receives Syslog messages over the [Reliable Event Logging Protocol (RELP)](../../integrations/relp.md).

```tql
accept_relp endpoint:string, [max_message_size=int, max_connections=int,
                             resolve_hostnames=bool, tls=record,
                             auto_detect_tls=bool]
```

## Description

Listens for RELP connections and emits one event for every complete `syslog` command. The operator negotiates the RELP version and the `syslog` command, preserves RELP message boundaries, and acknowledges accepted transactions.

RELP payloads can contain newlines and don’t require a trailing newline. The operator therefore emits the complete payload in `data` instead of treating it as a line-oriented byte stream.

The payload must contain valid UTF-8. Tenzir drops an invalid payload, emits a warning, and acknowledges it so that one malformed message doesn’t block later messages from the sender.

Use [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) with [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md) for Syslog over plain TCP, or [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md) for Syslog datagrams.

### Acknowledgement behavior

After the complete payload enters its bounded in-memory input queue, `accept_relp` sends a `200` response so that the sender can treat the message as delivered. A full queue delays the response and propagates backpressure to the sender. The response doesn’t mean that downstream processing is complete or that a destination has stored the event.

If the connection fails before the response arrives, the sender can retry the message. This can produce duplicate events, so design downstream processing to tolerate them.

### `endpoint: string`

The endpoint to listen on. It must have the form `[tcp://]<hostname>:<port>`. Use `0.0.0.0` as the host to accept connections on all interfaces.

### `max_message_size = int (optional)`

The largest RELP payload to accept, in bytes. The operator rejects a frame whose header declares a larger payload before allocating memory for it.

Defaults to `128Ki`.

### `max_connections = int (optional)`

The maximum number of RELP connections to process simultaneously.

Defaults to `128`.

### `resolve_hostnames = bool (optional)`

Perform reverse DNS lookups for connected peers. When enabled, the `peer` record includes a `hostname` field. The field is `null` when no PTR record is available.

Defaults to `false`.

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

### `auto_detect_tls = bool (optional)`

Accept plaintext and TLS RELP clients on the same endpoint. Connections that start with a TLS ClientHello use the configured TLS settings. Other connections continue as plaintext.

Enable TLS either with the `tls` option or with the node-level `tenzir.tls.enable` setting. `auto_detect_tls` defaults to `false`.

## Output schema

Each RELP `syslog` command produces one event:

```tql
{
  data: string,
  peer: {
    ip: ip,
    port: int,
    hostname: string, // Only present with resolve_hostnames=true.
  },
  relp: {
    transaction_id: int,
  },
}
```

## Examples

The following examples parse RELP payloads and configure client authentication.

### Receive and parse Syslog over RELP

```tql
accept_relp "0.0.0.0:2514"
syslog = data.parse_syslog()
```

[`accept_relp`](https://tenzir.com/docs/reference/operators/accept_relp.md) preserves each RELP message boundary. The default [`parse_syslog`](https://tenzir.com/docs/reference/functions/parse_syslog.md) mode accepts ordinary Syslog payloads and payloads that retain an RFC 6587 length prefix. Assigning the result to `syslog` preserves the original payload, peer information, and RELP transaction ID.

### Require client certificates

```tql
accept_relp "0.0.0.0:2514", tls={
  certfile: "server.pem",
  keyfile: "server-key.pem",
  client_ca: "clients-ca.pem",
  require_client_cert: true,
}
```

For more TLS configuration options, see our [Configure TLS](../../guides/node-setup/configure-tls.md) guide.
