---
title: "RELP integration"
description: "Receive Syslog messages with application-level acknowledgements, retransmission, and optional TLS."
canonical: https://tenzir.com/integrations/relp
source: https://tenzir.com/integrations/relp.md
section: "Integrations"
---

# RELP integration

> Receive Syslog messages with application-level acknowledgements, retransmission, and optional TLS.

The [Reliable Event Logging Protocol (RELP)](https://en.wikipedia.org/wiki/Reliable_Event_Logging_Protocol) transports Syslog messages with application-level acknowledgements. A sender keeps each message until the receiver confirms its RELP transaction. This makes connection failures detectable and lets the sender retransmit unacknowledged messages.

Tenzir receives RELP connections with [`accept_relp`](https://tenzir.com/docs/reference/operators/accept_relp.md). The operator preserves each message boundary, including embedded newlines, and emits the Syslog payload with peer and transaction metadata.

RELP frames carry command-defined payloads. [`accept_relp`](https://tenzir.com/docs/reference/operators/accept_relp.md) negotiates only the standard `syslog` command and emits its valid UTF-8 payload as a `data` string. It drops invalid UTF-8 with a warning and acknowledges the message so that later messages from the sender can continue.

## Receive and parse Syslog over RELP

Listen on all network interfaces and parse each RELP payload as Syslog:

```tql
accept_relp "0.0.0.0:2514"
syslog = data.parse_syslog()
```

[`accept_relp`](https://tenzir.com/docs/reference/operators/accept_relp.md) preserves each RELP message boundary. The default [`parse_syslog`](https://tenzir.com/docs/reference/functions/parse_syslog.md) mode accepts ordinary Syslog payloads and payloads that retain an RFC 6587 length prefix. Assigning the result to `syslog` keeps the unparsed event fields:

```tql
{
  data: string,
  peer: {
    ip: ip,
    port: int,
  },
  relp: {
    transaction_id: int,
  },
}
```

Use our [Syslog](syslog.md) integration for other Syslog transports and parsing examples.

## Understand acknowledgement behavior

[`accept_relp`](https://tenzir.com/docs/reference/operators/accept_relp.md) acknowledges a transaction after its complete payload enters a bounded in-memory input queue. If the queue fills, Tenzir delays the acknowledgement and applies backpressure to the sender. The acknowledgement does not mean that downstream processing is complete or that a destination has stored the event.

If the connection fails before the acknowledgement reaches the sender, the sender can retransmit the message. This can produce duplicate events, so design downstream processing to tolerate them.

## Encrypt RELP with TLS

Provide a certificate and private key to accept RELP over TLS:

```tql
accept_relp "0.0.0.0:2514", tls={
  certfile: "server.pem",
  keyfile: "server-key.pem",
}
syslog = data.parse_syslog()
```

To require mutual TLS, configure a client certificate authority and require a client certificate:

```tql
accept_relp "0.0.0.0:2514", tls={
  certfile: "server.pem",
  keyfile: "server-key.pem",
  client_ca: "clients-ca.pem",
  require_client_cert: true,
}
syslog = data.parse_syslog()
```

For certificate generation, trust stores, and additional TLS options, see our [Configure TLS](../guides/node-setup/configure-tls.md) guide.

## Accept plaintext and TLS clients

During a migration, you can accept plaintext and TLS RELP clients on one endpoint:

```tql
accept_relp "0.0.0.0:2514",
  tls={certfile: "server.pem", keyfile: "server-key.pem"},
  auto_detect_tls=true
syslog = data.parse_syslog()
```

Connections that start with a TLS ClientHello use TLS. Other connections continue as plaintext. You can also provide the certificate settings centrally under `tenzir.tls` and set `tenzir.tls.enable` to `true`; in that case, omit the operator’s `tls` option.

For a complete `omrelp` sender configuration with retries, queues, and mutual TLS, see our [rsyslog](rsyslog.md) integration.

Our [Get data from the network](../guides/collect/get-data-from-the-network.md) guide compares RELP with other network collection options.
