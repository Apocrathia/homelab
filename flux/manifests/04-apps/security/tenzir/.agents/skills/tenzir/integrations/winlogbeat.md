---
title: "Winlogbeat integration"
description: "Ships Windows Event Logs from Elastic's Winlogbeat agent to Tenzir."
canonical: https://tenzir.com/integrations/winlogbeat
source: https://tenzir.com/integrations/winlogbeat.md
section: "Integrations"
---

# Winlogbeat integration

> Ships Windows Event Logs from Elastic's Winlogbeat agent to Tenzir.

[Winlogbeat](https://www.elastic.co/beats/winlogbeat) is Elastic’s agent that ships Windows Event Logs into the Elastic Stack. Tenzir mimics the Bulk API of Elasticsearch with [`accept_opensearch`](https://tenzir.com/docs/reference/operators/accept_opensearch.md), so Winlogbeat sends its events to a Tenzir pipeline with its Elasticsearch output.

To collect Windows Event Logs without an agent on the hosts, see the [Microsoft Windows Event Forwarding](microsoft/windows-event-forwarding.md) page.

## Configure Winlogbeat

After [installing Winlogbeat](https://www.elastic.co/guide/en/beats/winlogbeat/current/winlogbeat-installation-configuration.html), create a configuration that selects the channels and points the Elasticsearch output at Tenzir:

winlogbeat.yml

```yaml
# Choose your channels.
winlogbeat.event_logs:
  - name: Application
  - name: System
  - name: Security
  - name: ForwardedEvents
  - name: Windows PowerShell
  - name: Microsoft-Windows-Sysmon/Operational
  - name: Microsoft-Windows-PowerShell/Operational
  - name: Microsoft-Windows-Windows Defender/Operational
  - name: Microsoft-Windows-TaskScheduler/Operational
  - name: Microsoft-Windows-TerminalServices-LocalSessionManager/Operational
  - name: Microsoft-Windows-TerminalServices-RDPClient/Operational


# Send data to a Tenzir pipeline with an Elasticsearch-compatible endpoint.
output.elasticsearch:
  hosts: ["https://10.0.0.1:9200"]
  username: "$USER"
  password: "$PASSWORD"
  ssl:
    enabled: true
    certificate_authorities: [C:\Program Files\Winlogbeat\ca.crt]
    # PEM format
    certificate: C:\Program Files\Winlogbeat\tenzir.crt
    key: C:\Program Files\Winlogbeat\tenzir.key
```

## Start Winlogbeat as a service

After completing your configuration, start the Winlogbeat service:

```plaintext
C:\Program Files\Winlogbeat> Start-Service winlogbeat
```

## Run a Tenzir pipeline

Accept the events with [`accept_opensearch`](https://tenzir.com/docs/reference/operators/accept_opensearch.md), which implements the Bulk API endpoint of the [Elasticsearch](elasticsearch.md) and [OpenSearch](opensearch.md) integrations:

```tql
accept_opensearch "10.0.0.1:9200", tls={
  certfile: "server.crt",
  keyfile: "private.key",
}
publish "windows"
```

## Map events to OCSF

[Install the Microsoft package](../guides/packages/install-a-package.md) to map the Windows events of Winlogbeat to OCSF. The `microsoft::windows::ocsf::normalize` operator recognizes the documents of Winlogbeat:

```tql
accept_opensearch "10.0.0.1:9200", tls={
  certfile: "server.crt",
  keyfile: "private.key",
}
microsoft::windows::ocsf::normalize
ocsf_derive
publish "ocsf"
```
