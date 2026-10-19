---
title: "Sysmon integration"
description: "Advanced system monitor that logs detailed host activity for threat hunting."
canonical: https://tenzir.com/integrations/sysmon
source: https://tenzir.com/integrations/sysmon.md
section: "Integrations"
---

# Sysmon integration

> Advanced system monitor that logs detailed host activity for threat hunting.

[Sysmon](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon) (System Monitor) is a Windows system service and device driver that, once installed, remains resident across reboots to monitor and log system activity to the Windows event log. Key features include:

* **Process creation tracking**: Logs details of new processes.
* **Network connection monitoring**: Records incoming and outgoing network connections.
* **File creation time changes**: Tracks changes to file creation times.
* **Driver and image load monitoring**: Logs loading of drivers and DLL files.
* **Registry tracking**: Monitors changes to the Windows registry.

Sysmon writes its events to the `Microsoft-Windows-Sysmon/Operational` channel, from which you can collect them like any other Windows events.

## Install Sysmon

Download Sysmon and extract the archive in PowerShell:

```powershell
Invoke-WebRequest -Uri "https://download.sysinternals.com/files/Sysmon.zip" -OutFile "Sysmon.zip"
Expand-Archive -Path Sysmon.zip -DestinationPath Sysmon
```

Choose a Sysmon configuration that defines what to log, for example from [Florian Roth](https://github.com/Neo23x0/sysmon-config/) or [SwiftOnSecurity](https://github.com/SwiftOnSecurity/sysmon-config):

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Neo23x0/sysmon-config/master/sysmonconfig-export.xml" -OutFile "sysmonconfig-export.xml"
```

Install Sysmon with the configuration:

```powershell
.\Sysmon64.exe -accepteula -i sysmonconfig-export.xml
```

## Collect Sysmon events

Collect the Sysmon channel with Windows Event Forwarding, as the [Microsoft Windows Event Forwarding](microsoft/windows-event-forwarding.md) page describes. Select the channel in a subscription:

```tql
let $sysmon = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Microsoft-Windows-Sysmon/Operational">*</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5985",
  kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "sysmon", query: $sysmon}]
this = data.parse_winlog()
publish "sysmon"
```

Windows forwards events as the `NETWORK SERVICE` account, which needs read access to the Sysmon channel. Show the current access of the channel and append `(A;;0x1;;;NS)` to it on every host, for example with a startup script that a Group Policy deploys:

```cmd
wevtutil gl Microsoft-Windows-Sysmon/Operational
wevtutil sl Microsoft-Windows-Sysmon/Operational /ca:<CURRENT_ACCESS>(A;;0x1;;;NS)
```

Agents read the channel as well. Add `Microsoft-Windows-Sysmon/Operational` to the channels of [Winlogbeat](winlogbeat.md), [NXLog](nxlog.md), or [Fluent Bit](fluent-bit.md).

## Hunt with Sysmon events

Sysmon identifies its event types by event ID, such as 1 for process creation and 3 for network connections. Find the processes that connect to the internet on unusual ports:

```tql
subscribe "sysmon"
where System.EventID == 3
where not EventData.DestinationIp.is_private()
where EventData.DestinationPort not in [80, 443]
select time=System.TimeCreated.SystemTime,
  computer=System.Computer,
  image=EventData.Image,
  destination=EventData.DestinationIp,
  port=EventData.DestinationPort
```

The [Microsoft Windows EVTX Files](microsoft/evtx.md) page shows more examples, such as process trees and the creation of scheduled tasks.

## Map events to OCSF

[Install the Microsoft package](../guides/packages/install-a-package.md) to map Sysmon events to OCSF classes, such as Process Activity and Network Activity. The `microsoft::windows::ocsf::normalize` operator takes the event XML directly, so it replaces `parse_winlog`:

```tql
let $sysmon = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Microsoft-Windows-Sysmon/Operational">*</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5985",
  kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "sysmon", query: $sysmon}]
microsoft::windows::ocsf::normalize data
ocsf_derive
publish "ocsf"
```
