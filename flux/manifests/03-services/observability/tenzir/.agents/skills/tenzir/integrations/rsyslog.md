---
title: "rsyslog integration"
description: "Forward Syslog to Tenzir with RELP acknowledgements, retries, queues, and optional mutual TLS."
canonical: https://tenzir.com/integrations/rsyslog
source: https://tenzir.com/integrations/rsyslog.md
section: "Integrations"
---

# rsyslog integration

> Forward Syslog to Tenzir with RELP acknowledgements, retries, queues, and optional mutual TLS.

[rsyslog](https://www.rsyslog.com/) is an open source log processing service commonly installed on Linux systems. Its [`omrelp` output module](https://docs.rsyslog.com/doc/configuration/modules/omrelp.html) forwards Syslog messages over the Reliable Event Logging Protocol (RELP).

Use RELP when rsyslog should retain messages until Tenzir acknowledges them. For the protocol behavior and Tenzir’s acknowledgement point, see our [RELP](relp.md) integration.

## Forward logs to Tenzir over RELP

Start a Tenzir pipeline with the [`accept_relp`](https://tenzir.com/docs/reference/operators/accept_relp.md) operator. It listens for RELP connections and keeps the transport metadata alongside the parsed Syslog message:

```tql
accept_relp "0.0.0.0:2514"
syslog = data.parse_syslog()
```

Install the distribution’s `rsyslog-relp` package before loading the module. For example, run `sudo apt install rsyslog-relp` on Debian or Ubuntu, or `sudo dnf install rsyslog-relp` on RHEL-family systems.

On the rsyslog host, load `omrelp` and point an action at the Tenzir node:

/etc/rsyslog.d/tenzir.conf

```text
module(load="omrelp")


action(
  type="omrelp"
  target="tenzir.example.com"
  port="2514"
  action.resumeRetryCount="-1"
  queue.type="LinkedList"
)
```

Replace `tenzir.example.com` with an address that resolves to the Tenzir node. The infinite retry count keeps the action suspended instead of discarding a message when the receiver is unavailable. The linked-list action queue lets rsyslog continue collecting while the RELP connection recovers.

Validate the configuration before restarting rsyslog:

```sh
sudo rsyslogd -N1
sudo systemctl restart rsyslog
```

Send a test message with `logger`:

```sh
logger "RELP test from rsyslog"
```

## Persist queued messages on disk

A memory-backed action queue doesn’t survive a host restart. Add a unique queue filename and save the queue during an orderly shutdown to enable a disk-assisted queue:

/etc/rsyslog.d/tenzir.conf

```text
global(workDirectory="/var/spool/rsyslog")
module(load="omrelp")


action(
  type="omrelp"
  target="tenzir.example.com"
  port="2514"
  action.resumeRetryCount="-1"
  queue.type="LinkedList"
  queue.filename="tenzir-relp"
  queue.saveOnShutdown="on"
)
```

Use the existing global work directory if your rsyslog configuration already defines one. See the [rsyslog queue documentation](https://docs.rsyslog.com/doc/concepts/queues.html) for queue size, disk space, and durability controls.

## Require mutual TLS

Configure the Tenzir listener with its server certificate and the certificate authority that issued the rsyslog client certificate:

```tql
accept_relp "0.0.0.0:2514", tls={
  certfile: "server.pem",
  keyfile: "server-key.pem",
  client_ca: "clients-ca.pem",
  require_client_cert: true,
}
syslog = data.parse_syslog()
```

Configure `omrelp` with the matching trust chain and client certificate:

/etc/rsyslog.d/tenzir.conf

```text
module(load="omrelp")


action(
  type="omrelp"
  target="tenzir.example.com"
  port="2514"
  action.resumeRetryCount="-1"
  queue.type="LinkedList"
  tls="on"
  tls.tlslib="openssl"
  tls.caCert="/etc/rsyslog.d/certs/ca.pem"
  tls.myCert="/etc/rsyslog.d/certs/rsyslog.pem"
  tls.myPrivKey="/etc/rsyslog.d/certs/rsyslog-key.pem"
  tls.authMode="name"
  tls.permittedPeer="tenzir.example.com"
)
```

The value of `tls.permittedPeer` must match an identity in the Tenzir server certificate. For certificate generation and trust-store guidance, see our [Configure TLS](../guides/node-setup/configure-tls.md) guide.

## Understand retries and duplicates

rsyslog removes a message from its RELP window after it receives Tenzir’s acknowledgement. If the connection fails before the acknowledgement arrives, rsyslog can send the message again. Design downstream processing to tolerate possible duplicates.

The rsyslog queue controls how long the sender retains pending messages. The RELP acknowledgement confirms that the complete payload entered Tenzir’s bounded in-memory input queue. It doesn’t confirm that downstream processing completed or a destination stored the event.

## See also

* [RELP](relp.md)
* [Syslog](syslog.md)
