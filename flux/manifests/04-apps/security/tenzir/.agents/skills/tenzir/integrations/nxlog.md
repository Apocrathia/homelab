---
title: "NXLog integration"
description: "Ships Windows Event Logs and other telemetry from the NXLog Agent to Tenzir."
canonical: https://tenzir.com/integrations/nxlog
source: https://tenzir.com/integrations/nxlog.md
section: "Integrations"
---

# NXLog integration

> Ships Windows Event Logs and other telemetry from the NXLog Agent to Tenzir.

The [NXLog Agent](https://nxlog.co/) collects logs on Windows, Linux, and other platforms, and sends them through numerous [output modules](https://docs.nxlog.co/refman/current/om/index.html). This page shows how to collect Windows Event Logs with NXLog and send them to Tenzir over TCP, TLS, or Kafka. All examples format the events as JSON with the `xm_json` extension.

If you use NXLog only to collect the events that Windows hosts forward, you can receive them in Tenzir directly instead, as the [Microsoft Windows Event Forwarding](microsoft/windows-event-forwarding.md) page shows.

## Collect Windows Event Logs

The [`im_msvistalog`](https://docs.nxlog.co/refman/current/im/msvistalog.html) input module reads the Windows Event Log. Select the channels with a query and set `AddPrefix TRUE`, which prefixes the fields of the `EventData` section with `EventData.` so that they don’t collide with the metadata of NXLog:

```plaintext
<Extension json>
  Module    xm_json
</Extension>


<Input eventlog>
  Module    im_msvistalog
  AddPrefix TRUE
  <QueryXML>
    <QueryList>
      <Query Id="0">
        <Select Path="Security">*</Select>
        <Select Path="System">*</Select>
      </Query>
    </QueryList>
  </QueryXML>
</Input>
```

Then add one of the following outputs, and a route from the input to it:

```plaintext
<Route eventlog_to_tenzir>
  Path      eventlog => tenzir
</Route>
```

## Ship logs via TCP

To send logs straight to a TCP socket, use the [TCP output module](https://docs.nxlog.co/refman/current/om/tcp.html):

```plaintext
<Output tenzir>
  Module    om_tcp
  Host      10.0.0.1:1514
  Exec      to_json();
</Output>
```

Accept the logs via [TCP](tcp.md). The `unflatten_separator` option turns the prefixed fields into an `EventData` record:

```tql
accept_tcp "10.0.0.1:1514" {
  read_json unflatten_separator="."
}
publish "windows"
```

## Ship logs via TLS

For an encrypted connection, use the [SSL output module](https://docs.nxlog.co/refman/current/om/ssl.html):

```plaintext
<Output tenzir>
  Module          om_ssl
  Host            10.0.0.1:6514
  CAFile          %CERTDIR%/ca.pem
  CertFile        %CERTDIR%/client-cert.pem
  CertKeyFile     %CERTDIR%/client-key.pem
  KeyPass         secret
  Exec            to_json();
</Output>
```

Accept the logs via TCP with TLS:

```tql
accept_tcp "10.0.0.1:6514",
  tls={certfile: "server-cert.pem", keyfile: "server-key.pem"} {
    read_json unflatten_separator="."
  }
publish "windows"
```

## Ship logs via Kafka

The [Kafka output module](https://docs.nxlog.co/refman/current/om/kafka.html) publishes to a Kafka topic that Tenzir can read from. Use the following output to publish to the `nxlog` topic:

```plaintext
<Output tenzir>
  Module          om_kafka
  BrokerList      localhost:9092
  Topic           nxlog
  LogqueueSize    100000
  Partition       0
  Protocol        ssl
  CAFile          %CERTDIR%/ca.pem
  CertFile        %CERTDIR%/client-cert.pem
  CertKeyFile     %CERTDIR%/client-key.pem
  KeyPass         thisisasecret
  Exec            to_json();
</Output>
```

Then use [Kafka](kafka.md) to read from the topic:

```tql
from_kafka "nxlog"
this = message.parse_json(unflatten_separator=".")
publish "windows"
```

## Map events to OCSF

[Install the Microsoft package](../guides/packages/install-a-package.md) to map the Windows events of NXLog to OCSF. The `microsoft::windows::ocsf::normalize` operator recognizes the records of NXLog:

```tql
accept_tcp "10.0.0.1:1514" {
  read_json unflatten_separator="."
}
microsoft::windows::ocsf::normalize
ocsf_derive
publish "ocsf"
```
