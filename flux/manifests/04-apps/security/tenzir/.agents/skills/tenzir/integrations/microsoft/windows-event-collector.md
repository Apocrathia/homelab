---
title: "Microsoft Windows Event Collector integration"
description: "Receives events from a Windows Event Collector through the shipping agent of your choice."
canonical: https://tenzir.com/integrations/microsoft/windows-event-collector
source: https://tenzir.com/integrations/microsoft/windows-event-collector.md
section: "Integrations"
---

# Microsoft Windows Event Collector integration

> Receives events from a Windows Event Collector through the shipping agent of your choice.

A Windows Event Collector (WEC) is a Windows Server that receives the events that hosts forward with Windows Event Forwarding (WEF). The hosts use Windows Remote Management (WinRM) to fetch the subscriptions of the collector and push the selected events, which the collector writes to its `ForwardedEvents` channel. Subscriptions define which events to collect from which hosts, using criteria such as event IDs, keywords, or log levels.

In this architecture, Tenzir sits downstream of the WEC. You keep the Windows collector and use the agent of your choice to read its `ForwardedEvents` channel and send the events to a supported Tenzir input. Tenzir does not require a particular shipping agent.

Tenzir with a WEC: Windows hosts forward events to a Windows collector, and an agent ships its ForwardedEvents channel to Tenzir.

Tenzir can also [be the WEC itself](windows-event-collector.md#replace-the-collector-with-tenzir). The [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) operator manages subscriptions and receives events directly from the hosts, without an intermediate Windows collector or shipping agent. Our [Microsoft Windows Event Forwarding](windows-event-forwarding.md) integration describes that architecture.

## Set up the Windows Event Collector

The following steps follow the instructions of [SEKOIA](https://docs.sekoia.io/xdr/features/collect/integrations/endpoint/windows/#windows-event-forwarder-to-windows-event-collector-to-a-concentrator).

### Configure Windows Remote Management

Configure WinRM on the collector:

```cmd
winrm qc -q
```

The `qc` subcommand performs a quick configuration with default settings. It starts the WinRM service, sets it to start automatically, creates an HTTP listener for WS-Management requests, and configures the Windows Firewall to allow WinRM traffic. The `-q` flag skips all prompts.

Encryption over HTTP

WinRM encrypts the messages of hosts that authenticate with Kerberos, even over HTTP. Hosts outside of a domain authenticate with client certificates, which require an HTTPS listener with a server certificate.

### Enable the Event Collector service

Configure the Windows Event Collector service:

```cmd
wecutil qc /q
```

As with WinRM, `qc` performs a quick configuration and `/q` skips all prompts. The service then starts automatically and is ready to manage subscriptions.

### Create a subscription

Create `DC_SUBSCRIPTION.xml` with a source-initiated subscription:

Complete subscription XML

DC\_SUBSCRIPTION.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Subscription xmlns="http://schemas.microsoft.com/2006/03/windows/events/subscription">
    <!-- Name of subscription -->
    <SubscriptionId>DC_SUBSCRIPTION</SubscriptionId>
    <!-- Push mode (DC to WEC) -->
    <SubscriptionType>SourceInitiated</SubscriptionType>
    <Description>Source Initiated Subscription from DC_SUBSCRIPTION</Description>
    <!-- Subscription is active -->
    <Enabled>true</Enabled>
    <Uri>http://schemas.microsoft.com/wbem/wsman/1/windows/EventLog</Uri>
    <!-- This mode ensures that events are delivered with minimal delay -->
    <!-- It is an appropriate choice if you are collecting alerts or critical events -->
    <!-- It uses push delivery mode and sets a batch timeout of 30 seconds -->
    <ConfigurationMode>MinLatency</ConfigurationMode>
    <!-- Event log to retrieved -->
    <Query>
        <![CDATA[
            <QueryList>
                <Query Id="0">
                    <Select Path="Application">*</Select>
                    <Select Path="Security">*</Select>
                    <Select Path="System">*</Select>
                </Query>
            </QueryList>
        ]]>
    </Query>
    <!-- Collect events generated since the subscription (not oldest) -->
    <ReadExistingEvents>false</ReadExistingEvents>
    <!-- Protocol and port used (DC to WEC) -->
    <TransportName>http</TransportName>
    <!-- Mandatory value (https://www-01.ibm.com/support/docview.wss?crawler=1&uid=swg1IV71375) -->
    <ContentFormat>RenderedText</ContentFormat>
    <Locale Language="en-US"/>
    <!-- Target Event log on WEC -->
    <LogFile>ForwardedEvents</LogFile>
    <!-- Define which domain computers are allowed or not to initiate subscriptions -->
    <!-- This example grants members of the Domain Computers domain group, as well as the local Network Service group (for local forwarder) -->
    <AllowedSourceDomainComputers>O:NSG:NSD:(A;;GA;;;DC)(A;;GA;;;NS)</AllowedSourceDomainComputers>
</Subscription>
```

The key elements are:

* `SubscriptionId`: The unique name of the subscription.
* `SubscriptionType`: `SourceInitiated` for push or `CollectorInitiated` for pull.
* `Description`: A meaningful description.
* `Query`: The event log query that selects the events to collect.
* `LogFile`: The channel on the collector that receives the events.
* `AllowedSourceDomainComputers`: An [SDDL](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptor-definition-language) string that defines which computers can forward events.

The [Palantir](https://github.com/palantir/windows-event-forwarding/tree/master/wef-subscriptions), [NSA](https://github.com/nsacyber/Event-Forwarding-Guidance/tree/master/Subscriptions/samples), and [mdecrevoisier](https://github.com/mdecrevoisier/Windows-WEC-server_auto-deploy/tree/master/windows-subscriptions) repositories contain more subscriptions.

### Activate the subscription

Create the subscription from the file:

```cmd
wecutil cs "<FILE_PATH>\DC_SUBSCRIPTION.xml"
```

### Verify the subscription

Show the runtime status of the subscription, which lists the hosts that forward events:

```cmd
wecutil gr DC_SUBSCRIPTION
```

## Configure the hosts

Configure WinRM on every host that forwards events, as on the collector:

```cmd
winrm qc -q
```

Then point the hosts at the collector with a Group Policy. In the Group Policy Management Editor, or the Local Group Policy Editor (`gpedit.msc`) for a single host, open `Computer Configuration\Administrative Templates\Windows Components\Event Forwarding`, enable the policy “Configure target Subscription Manager”, and add the collector:

```plaintext
Server=http://wec.example.org:5985/wsman/SubscriptionManager/WEC,Refresh=60
```

Apply the policy with `gpupdate /force`, and [verify the subscription](windows-event-collector.md#verify-the-subscription) on the collector.

## Ship the collected events to Tenzir

Choose an agent that reads the `ForwardedEvents` channel and delivers its events to a supported Tenzir input. The choice of agent determines the input operator and event format of the receiving pipeline, not whether Tenzir can work with your WEC.

For configuration examples, our [Winlogbeat](../winlogbeat.md), [NXLog](../nxlog.md), and [Fluent Bit](../fluent-bit.md) integrations describe the agents and matching Tenzir pipelines. These are examples, not a required set of agents. Configure the agent for the `ForwardedEvents` channel, for example in Winlogbeat:

winlogbeat.yml

```yaml
winlogbeat.event_logs:
  - name: ForwardedEvents
```

## Replace the collector with Tenzir

[`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) acts as the collector itself, so the hosts forward their events directly to a Tenzir pipeline. The [Microsoft Windows Event Forwarding](windows-event-forwarding.md) page describes the setup with Kerberos or client certificates.

Translate each subscription into a record for the `subscriptions` argument:

| Subscription element               | `accept_wef` field     |
| ---------------------------------- | ---------------------- |
| `SubscriptionId`                   | `id`                   |
| `Query`                            | `query`                |
| `ContentFormat`                    | `content_format`       |
| `ReadExistingEvents`               | `read_existing_events` |
| `Locale`                           | `locale`               |
| `Delivery/Batching/MaxLatencyTime` | `batch_timeout`        |
| `Delivery/Batching/MaxItems`       | `max_events`           |
| `Delivery/PushSettings/Heartbeat`  | `heartbeat`            |
| `AllowedSourceDomainComputers`     | `clients`              |

The defaults of [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) match the `MinLatency` configuration mode: batches of at most 30 seconds and a heartbeat every hour. For the `Normal` mode, set `batch_timeout` and `heartbeat` to `15min`, and for `MinBandwidth`, to `6h`. Instead of an SDDL string, `clients` takes patterns that match the identities of the hosts, such as `{only: ["dc*"]}` for the domain controllers.

Then change the “Configure target Subscription Manager” policy to the URL of Tenzir. The hosts treat the subscriptions of Tenzir as new and start forwarding the events that they log from then on. Set `read_existing_events: true` in a subscription to also receive the events that the hosts still keep in their logs, which overlap with the events that the old collector received.
