---
title: "UDP integration"
description: "Send and receive lightweight, connectionless datagrams over IP networks."
canonical: https://tenzir.com/integrations/udp
source: https://tenzir.com/integrations/udp.md
section: "Integrations"
---

# UDP integration

> Send and receive lightweight, connectionless datagrams over IP networks.

The [User Datagram Protocol (UDP)](https://en.wikipedia.org/wiki/User_Datagram_Protocol) is a connection-less protocol to send messages on an IP network. Tenzir supports writing to and reading from UDP sockets, both in server (listening) and client (connect) mode.

UDP

Use the IP address `0.0.0.0` to listen on all available network interfaces.

## Examples

Use [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md) to receive UDP datagrams as structured events containing message data and peer information. Use [`to_udp`](https://tenzir.com/docs/reference/operators/to_udp.md) to send one UDP datagram per event directly from structured data.

### Receive syslog messages over UDP

```tql
accept_udp "0.0.0.0:514"
this = data.parse_syslog()
```

### Receive NetFlow and IPFIX

Set `binary=true` to preserve the message bytes, then pass each datagram to [`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md):

```tql
accept_udp "0.0.0.0:2055", binary=true
read_netflow
```

[`read_netflow`](https://tenzir.com/docs/reference/operators/read_netflow.md) detects NetFlow v5, NetFlow v9, and IPFIX and uses the peer metadata to isolate exporter-specific template state. See the [NetFlow](netflow.md) integration for complete collector setup.

### Send events to a UDP socket

```tql
from {message: "Tenzir"}
to_udp "1.2.3.4:8080", message=message
```
