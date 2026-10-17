---
title: "OpenWEC integration"
description: "Receives the Windows events that the open-source Windows Event Collector for Linux gathers."
canonical: https://tenzir.com/integrations/openwec
source: https://tenzir.com/integrations/openwec.md
section: "Integrations"
---

# OpenWEC integration

> Receives the Windows events that the open-source Windows Event Collector for Linux gathers.

[OpenWEC](https://github.com/cea-sec/openwec) is an open-source Windows Event Collector for Linux. Windows hosts forward their events to it with Windows Event Forwarding, and OpenWEC sends them on to outputs such as files, Kafka, or TCP. If you run OpenWEC, you can send the events that it collects to Tenzir.

An administrator configures subscriptions on OpenWEC. Windows hosts forward the matching event logs to OpenWEC, which sends them to Tenzir.

Collect directly with Tenzir

Tenzir can also [replace OpenWEC](openwec.md#replace-openwec-with-tenzir), because [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) receives the events of the hosts directly.

## Set up OpenWEC

The [OpenWEC getting started guide](https://github.com/cea-sec/openwec/blob/main/doc/getting_started.md) describes the setup with Kerberos, and the [TLS guide](https://github.com/cea-sec/openwec/blob/main/doc/tls.md) the setup with client certificates. For TLS, the OpenWEC documentation recommends [a script collection from NXLog](https://gitlab.com/nxlog-public/contrib/-/tree/master/windows-event-forwarding) that creates the keys and certificates for both the Windows hosts and the collector:

```bash
git clone https://gitlab.com/nxlog-public/contrib
cd contrib/windows-event-forwarding
./genca.sh myca
./gencert-server.sh openwec.example.org
./gencert-client.sh win10.example.org
```

The server script prints the subscription manager for the Group Policy of the hosts, including the thumbprint of the CA:

```plaintext
Server=HTTPS://openwec.example.org:5986/wsman/,Refresh=14400,IssuerCA=<THUMBPRINT>
```

Configure OpenWEC to listen on the same port with the certificates:

openwec.conf.toml

```toml
[database]
type = "SQLite"
path = "/var/db/openwec/openwec.sqlite"


[[collectors]]
listen_address = "0.0.0.0"
listen_port = 5986
hostname = "openwec.example.org"


[collectors.authentication]
type = "Tls"
ca_certificate = "/etc/openwec/ca-cert.pem"
server_certificate = "/etc/openwec/server-cert.pem"
server_private_key = "/etc/openwec/server-key.pem"
```

Initialize the database once, then start the server:

```bash
openwec -c openwec.conf.toml db init
openwecd -c openwec.conf.toml
```

## Send events to Tenzir

Define a subscription in a file with a TCP output. The `RawJson` format wraps each event’s XML in a record with metadata about the host and the subscription:

conf/security.toml

```toml
uuid = "28fcc206-1336-4e4a-b76b-18b0ab46e585"
name = "security"


query = """
<QueryList>
  <Query Id="0">
    <Select Path="Security">*</Select>
    <Select Path="System">*</Select>
  </Query>
</QueryList>
"""


[[outputs]]
driver = "Tcp"
format = "RawJson"
config = { host = "10.0.0.1", port = 1514 }
```

Load the subscription while the server runs:

```bash
openwec -c openwec.conf.toml subscriptions load conf
```

## Run a Tenzir pipeline

Accept the events from OpenWEC via [TCP](tcp.md) and parse the XML of each event with [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md):

```tql
accept_tcp "10.0.0.1:1514" {
  read_json
}
event = data.parse_winlog()
publish "windows"
```

The `meta` field holds the metadata of OpenWEC, such as the authenticated client in `meta.Client` and the subscription in `meta.Subscription`. The [Microsoft Windows Event Logs](microsoft/windows-event-logs.md) page shows how to process the events further and how to map them to OCSF.

## Replace OpenWEC with Tenzir

[`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) plays the role of OpenWEC, so the hosts forward their events directly to a Tenzir pipeline. The [Microsoft Windows Event Forwarding](microsoft/windows-event-forwarding.md) page describes the setup with Kerberos or client certificates.

The subscription parameters of OpenWEC map to the fields of a subscription in [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md):

| OpenWEC parameter                                     | `accept_wef` field      |
| ----------------------------------------------------- | ----------------------- |
| `name`                                                | `id`                    |
| `query`                                               | `query`                 |
| `uri`                                                 | `uri`                   |
| `max_time`                                            | `batch_timeout`         |
| `max_elements`                                        | `max_events`            |
| `heartbeat_interval`                                  | `heartbeat`             |
| `connection_retry_count`, `connection_retry_interval` | `connection_retry`      |
| `read_existing_events`                                | `read_existing_events`  |
| `content_format`                                      | `content_format`        |
| `ignore_channel_error`                                | `ignore_channel_error`  |
| `locale`, `data_locale`                               | `locale`, `data_locale` |
| `filter` with the `Client` type                       | `clients`               |

OpenWEC takes durations in seconds, while [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) takes TQL durations, such as `30s`. The `clients` field always matches patterns case-insensitively, and it doesn’t filter by the `MachineID` that hosts claim, because hosts don’t authenticate that name. The `max_envelope_size` parameter corresponds to the `max_request_size` argument of the operator.

Then point the subscription manager in the Group Policy of the hosts at Tenzir. The hosts treat the subscriptions of Tenzir as new and start forwarding the events that they log from then on. Set `read_existing_events: true` in a subscription to also receive the events that the hosts still keep in their logs.
