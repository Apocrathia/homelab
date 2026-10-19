---
title: "Microsoft Windows Event Logs integration"
description: "Collects Security, System, Application, and other critical OS logs."
canonical: https://tenzir.com/integrations/microsoft/windows-event-logs
source: https://tenzir.com/integrations/microsoft/windows-event-logs.md
section: "Integrations"
---

# Microsoft Windows Event Logs integration

> Collects Security, System, Application, and other critical OS logs.

Windows Event Logs record system, security, and application events on Windows. You can collect them into Tenzir for monitoring, troubleshooting, and analysis.

Tenzir can be your Windows Event Collector (WEC) or receive events from a collector you already run. Both architectures use the built-in Windows Event Forwarding (WEF) on the hosts:

* Use [Tenzir as the WEC](windows-event-forwarding.md). The [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md) operator manages subscriptions and receives events directly from Windows hosts. No separate Windows collector or shipping agent is needed.
* Use [Tenzir with a WEC](windows-event-collector.md). Keep your Windows collector and use the agent of your choice to read its `ForwardedEvents` channel and send the events to a supported Tenzir input. Tenzir is not tied to a particular agent.

You can also collect through OpenWEC, run an agent on every host, or process exported EVTX files.

## Choose a collection method

The methods differ in what they need on the hosts and in between:

| Method                                                                       | On the hosts                           | In between                            |
| ---------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------- |
| [WEF](windows-event-forwarding.md) | Built in, configured by a Group Policy | Nothing, Tenzir is the collector      |
| [WEC](windows-event-collector.md)  | Built in, configured by a Group Policy | A Windows Server and a shipping agent |
| [OpenWEC](../openwec.md)                        | Built in, configured by a Group Policy | A Linux server with OpenWEC           |
| [Winlogbeat](../winlogbeat.md)                  | An agent on every host                 | Nothing                               |
| [NXLog](../nxlog.md)                            | An agent on every host                 | Nothing                               |
| [Fluent Bit](../fluent-bit.md)                  | An agent on every host                 | Nothing                               |
| [Windows EVTX Files](evtx.md)      | An export of the logs                  | Nothing                               |

Choose direct WEF collection when you want Tenzir to manage subscriptions and receive events in one pipeline. Keep a Windows Event Collector when you want it to gather the events, and choose the shipping agent that fits your deployment. You can also keep an OpenWEC deployment and send its events to Tenzir. Agents on every host suit fleets that already run one, and EVTX files suit forensic investigations of individual hosts.

Windows hosts run an agent such as Fluent Bit, Winlogbeat, or NXLog to read the Application, Security, System, Setup, and ForwardedEvents channels and send events to Tenzir.

Two Windows features add detail to what the event logs record: [Sysmon](../sysmon.md) logs process, network, and registry activity, and [PowerShell Script Block Logging](../powershell-script-block-logging.md) logs the PowerShell code that runs on a host.

## Parse Windows Event Log XML

Windows Event Forwarding, Windows Event Collectors, OpenWEC, and `evtx_dump` deliver every event as XML in the [Windows Event schema](https://learn.microsoft.com/en-us/windows/win32/wes/eventschema-schema). Use [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md) to turn the XML into a structured record. The function handles the `System`, `EventData`, `UserData`, and `RenderingInfo` sections, turns XML attributes into regular fields, parses timestamps, and uses the names of `EventData` elements as field names.

### Parse XML events from a file

```tql
from_file "windows_events.xml" {
  read_delimited "</Event>\n", include_separator=true
}
this = data.parse_winlog()
```

### Filter for specific event IDs

Security monitoring often focuses on specific event types. Filter for successful (event ID 4624) and failed logons (event ID 4625) among the parsed events that a collection pipeline publishes to the `windows` topic:

```tql
subscribe "windows"
where System.EventID in [4624, 4625]
```

### Extract EventData fields

The `EventData` section contains event-specific fields. For a successful logon, extract the relevant information:

```tql
subscribe "windows"
where System.EventID == 4624
select \
  timestamp = System.TimeCreated.SystemTime,
  computer = System.Computer,
  logon_type = EventData.LogonType,
  target_user = EventData.TargetUserName,
  source_ip = EventData.IpAddress
```

## Map events to OCSF

[Install the Microsoft package](../../guides/packages/install-a-package.md) to map Windows events to OCSF. The `microsoft::windows::ocsf::normalize` operator takes the event XML, as well as the records of Fluent Bit, NXLog, and Winlogbeat. Events without a specialized mapping become OCSF Base Events and retain their provider data in `unmapped`.

The operator replaces [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md) in a collection pipeline, for example in one that receives events with [`accept_wef`](https://tenzir.com/docs/reference/operators/accept_wef.md):

```tql
let $query = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Security">*</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5985",
  kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "security", query: $query}]
microsoft::windows::ocsf::normalize data
ocsf_derive
publish "ocsf"
```
