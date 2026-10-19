---
title: "PowerShell Script Block Logging integration"
description: "Captures deobfuscated PowerShell commands, critical for detecting fileless malware and living-off-the-land attacks."
canonical: https://tenzir.com/integrations/powershell-script-block-logging
source: https://tenzir.com/integrations/powershell-script-block-logging.md
section: "Integrations"
---

# PowerShell Script Block Logging integration

> Captures deobfuscated PowerShell commands, critical for detecting fileless malware and living-off-the-land attacks.

PowerShell script block logging records the code of every command and script that PowerShell runs, after PowerShell decoded and deobfuscated it. Attackers favor PowerShell because it ships with Windows and runs code from memory, so the logged script blocks are a key source for detecting fileless malware and living-off-the-land attacks.

PowerShell writes each script block as event ID 4104 to the `Microsoft-Windows-PowerShell/Operational` channel. It splits long script blocks into several events that share a `ScriptBlockId` and number their parts with `MessageNumber` and `MessageTotal`.

## Enable script block logging

Enable the policy “Turn on PowerShell Script Block Logging” under `Computer Configuration\Administrative Templates\Windows Components\Windows PowerShell` in a Group Policy. Without the policy, PowerShell logs only the script blocks that it considers suspicious, as warnings.

To enable the logging on a single host, set the registry value that the policy manages:

```powershell
New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Value 1
```

The setting applies to Windows PowerShell. PowerShell 7 has its own policy and logs to the `PowerShellCore/Operational` channel.

## Collect script blocks

Collect the script blocks with Windows Event Forwarding, as the [Microsoft Windows Event Forwarding](microsoft/windows-event-forwarding.md) page describes. Select only event ID 4104 of the channel in a subscription:

```tql
let $script_blocks = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Microsoft-Windows-PowerShell/Operational">*[System[(EventID=4104)]]</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5985",
  kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "powershell", query: $script_blocks}]
this = data.parse_winlog()
publish "powershell"
```

Agents read the channel as well. Add `Microsoft-Windows-PowerShell/Operational` to the channels of [Winlogbeat](winlogbeat.md), [NXLog](nxlog.md), or [Fluent Bit](fluent-bit.md).

## Reassemble long script blocks

PowerShell logs the parts of a script block in quick succession. Collect the parts within a short window, order them by their number, and join them into the complete script:

```tql
subscribe "powershell"
window size=1min {
  sort EventData.MessageNumber
  summarize computer=System.Computer,
    id=EventData.ScriptBlockId,
    parts=collect(EventData.ScriptBlockText),
    total=max(EventData.MessageTotal)
}
complete = parts.length() == total
script = parts.join()
drop parts
```

The `complete` field is `false` when the parts of a script block straddle the boundary of two windows. Then two events carry the two halves of the script.

## Hunt for suspicious script blocks

PowerShell logs a script block as a warning (level 3) when it contains terms that attackers commonly use. Search for such blocks, and for techniques that download or decode code at runtime:

```tql
subscribe "powershell"
where System.Level == 3 or
  EventData.ScriptBlockText.match_regex("(?i)(downloadstring|frombase64string|invoke-expression)")
select time=System.TimeCreated.SystemTime,
  computer=System.Computer,
  id=EventData.ScriptBlockId,
  script=EventData.ScriptBlockText
```

## Map events to OCSF

[Install the Microsoft package](../guides/packages/install-a-package.md) to map the script blocks to the OCSF Script Activity class. The `microsoft::windows::ocsf::normalize` operator takes the event XML directly, so it replaces `parse_winlog`:

```tql
let $script_blocks = r#"
<QueryList>
  <Query Id="0">
    <Select Path="Microsoft-Windows-PowerShell/Operational">*[System[(EventID=4104)]]</Select>
  </Query>
</QueryList>
"#
accept_wef "0.0.0.0:5985",
  kerberos={keytab: "/etc/tenzir/wef.keytab"},
  subscriptions=[{id: "powershell", query: $script_blocks}]
microsoft::windows::ocsf::normalize data
ocsf_derive
publish "ocsf"
```
