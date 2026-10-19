---
title: "Microsoft Windows EVTX Files integration"
description: "Parses exported Windows Event Log files in the binary EVTX format for forensic analysis."
canonical: https://tenzir.com/integrations/microsoft/evtx
source: https://tenzir.com/integrations/microsoft/evtx.md
section: "Integrations"
---

# Microsoft Windows EVTX Files integration

> Parses exported Windows Event Log files in the binary EVTX format for forensic analysis.

Windows stores its event logs as files in the binary EVTX format, such as `C:\Windows\System32\winevt\Logs\Security.evtx`. Incident responders export or collect these files from a host and analyze them elsewhere. The [`evtx_dump`](https://github.com/omerbenamram/evtx) utility converts EVTX files to the Windows Event Log XML that [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md) parses. The resulting events have the same structure as the events that Windows hosts forward, so the same pipelines work for both.

## Install evtx\_dump

Download a binary for Linux, macOS, or Windows from the [releases of the evtx project](https://github.com/omerbenamram/evtx/releases), or install it with a package manager:

```bash
# Homebrew
brew install evtx
# Cargo
cargo install evtx
```

To reproduce the outputs, download the [EVTX samples](https://github.com/omerbenamram/evtx/tree/master/samples). Save `security.evtx` as `Security.evtx`, `sysmon.evtx` as `Sysmon.evtx`, and `Archive-ForwardedEvents-test.evtx` as `ForwardedEvents.evtx`.

## Convert EVTX to XML

Convert an exported Security log to a stream of XML events:

```bash
evtx_dump \
  --threads 1 \
  --format xml \
  --dont-show-record-number \
  --no-indent \
  Security.evtx > Security.xml
```

The `--threads 1` option preserves the original event order. You can omit it when ordering does not matter. The remaining options produce concatenated XML records without the `Record N` lines that `evtx_dump` displays by default.

Split the XML stream at each closing `Event` element, remove [invalid control characters](evtx.md#handle-characters-that-xml-does-not-allow), and inspect a few fields of the first two parsed events:

```tql
from_file "Security.xml" {
  read_delimited "</Event>\n", include_separator=true
}
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
select id=System.EventID, channel=System.Channel, computer=System.Computer
head 2
```

```tql
{id: 4608, channel: "Security", computer: "37L4247F27-25"}
{id: 4624, channel: "Security", computer: "37L4247F27-25"}
```

Omit `select` and `head` to keep the complete events.

## Read EVTX files in a pipeline

You can skip the intermediate XML file. The [`shell`](https://tenzir.com/docs/reference/operators/shell.md) operator runs `evtx_dump` and passes its output to the rest of the pipeline:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Security.evtx"
read_delimited "</Event>\n", include_separator=true
this = data.parse_winlog()
```

Files from a crashed or tampered host can contain damaged chunks. The `evtx_dump` utility reports them on its standard error and continues with the next chunk.

Alternatively, pipe `evtx_dump` into the Tenzir CLI. Save the following pipeline as `evtx.tql`:

```tql
from_stdin {
  read_delimited "</Event>\n", include_separator=true
}
this = data.parse_winlog()
```

Then run the converter and the pipeline together:

```bash
evtx_dump \
  --threads 1 \
  --format xml \
  --dont-show-record-number \
  --no-indent \
  Security.evtx \
  | tenzir -f evtx.tql
```

### Read many EVTX files

A forensic collection usually contains the logs of many channels and hosts. Loop over the files in the command of [`shell`](https://tenzir.com/docs/reference/operators/shell.md):

```tql
shell r#"for file in evidence/*.evtx; do
  evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent "$file"
done"#
read_delimited "</Event>\n", include_separator=true
this = data.parse_winlog()
```

### Handle characters that XML does not allow

Some events contain control characters that XML does not allow, such as the byte `0x03` in an event of the `security.evtx` sample. [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md) emits a warning and returns `null` for such an event. Remove these characters before you parse the events:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Security.evtx"
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
```

The examples on this page include this step where the sample files need it.

## Examples

The following examples analyze the sample files of the evtx project.

### Get an overview of a log

Count the events of each event ID to see what a log contains:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Security.evtx"
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
summarize id=System.EventID, events=count()
sort -events
head 4
```

```tql
{id: 4907, events: 620}
{id: 4624, events: 583}
{id: 4672, events: 459}
{id: 5061, events: 102}
```

### Summarize logons

Successful logons (event ID 4624) record the account and the [logon type](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4624), such as 2 for an interactive logon at the console or 10 for a remote desktop session:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Security.evtx"
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
where System.EventID == 4624
summarize user=EventData.TargetUserName, logon_type=EventData.LogonType, logons=count()
sort -logons
head 3
```

```tql
{user: "SYSTEM", logon_type: 5, logons: 337}
{user: "fsir", logon_type: 2, logons: 80}
{user: "SYSTEM", logon_type: 0, logons: 40}
```

### Find repeated failed logons

Failed logons (event ID 4625) from the same source for the same account can indicate password guessing. Report the combinations with at least 10 failures in the `ForwardedEvents` log of a Windows Event Collector, such as the `Archive-ForwardedEvents-test.evtx` sample:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent ForwardedEvents.evtx"
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
where System.EventID == 4625
summarize user=EventData.TargetUserName, source=EventData.IpAddress, failures=count()
where failures >= 10
sort -failures
head 3
```

```tql
{user: "psadmin", source: 10.115.247.239, failures: 71}
{user: "CTX-WS16-FS-T3$", source: 10.115.55.139, failures: 56}
```

The `IpAddress` field is of type `ip`, so you can filter it with subnets, such as `where source in 10.0.0.0/8`.

### Show which processes start which

[Sysmon](../sysmon.md) logs every process creation as event ID 1, with the image of the process and of its parent. Count the pairs of parent and child process names:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Sysmon.evtx"
read_delimited "</Event>\n", include_separator=true
this = data.parse_winlog()
where System.EventID == 1
parent = EventData.ParentImage.file_name()
image = EventData.Image.file_name()
summarize parent, image, processes=count()
sort -processes
head 5
```

```tql
{parent: "cmd.exe", image: "PING.EXE", processes: 131}
{parent: "services.exe", image: "UI0Detect.exe", processes: 10}
{parent: "msiexec.exe", image: "schtasks.exe", processes: 7}
{parent: "svchost.exe", image: "wermgr.exe", processes: 5}
{parent: "svchost.exe", image: "MusNotification.exe", processes: 4}
```

### Hunt for scheduled task creation

Attackers often persist by creating scheduled tasks with `schtasks.exe`. Find the command lines that create a task:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Sysmon.evtx"
read_delimited "</Event>\n", include_separator=true
this = data.parse_winlog()
where System.EventID == 1
where EventData.Image.file_name().to_lower() == "schtasks.exe"
where EventData.CommandLine.match_regex("(?i)[/-]create")
select time=System.TimeCreated.SystemTime,
  parent=EventData.ParentImage,
  command=EventData.CommandLine
head 2
```

```tql
{
  time: 2018-03-06T08:13:41.276431Z,
  parent: "C:\\Windows\\System32\\msiexec.exe",
  command: "C:\\Windows\\SysWOW64\\schtasks.exe -create -tn Microsoft\\Windows\\rempl\\shell-compact -xml ShellCompact.xml -F",
}
{
  time: 2018-03-06T08:13:41.448431Z,
  parent: "C:\\Windows\\System32\\msiexec.exe",
  command: "C:\\Windows\\SysWOW64\\schtasks.exe -create -tn Microsoft\\Windows\\rempl\\shell-restore -xml ShellRestore.xml -F",
}
```

### Build a timeline across logs

Merge the events of all logs into one timeline to see what happened on a host around a point in time:

```tql
shell r#"for file in evidence/*.evtx; do
  evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent "$file"
done"#
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
let $start = 2018-03-06T08:13:41.3Z
where System.TimeCreated.SystemTime >= $start
where System.TimeCreated.SystemTime < $start + 100ms
select time=System.TimeCreated.SystemTime, channel=System.Channel, id=System.EventID
sort time
```

```tql
{time: 2018-03-06T08:13:41.335289Z, channel: "Microsoft-Windows-Sysmon/Operational", id: 10}
{time: 2018-03-06T08:13:41.335969Z, channel: "Microsoft-Windows-Sysmon/Operational", id: 10}
{time: 2018-03-06T08:13:41.347064Z, channel: "Microsoft-Windows-Sysmon/Operational", id: 1}
{time: 2018-03-06T08:13:41.352904Z, channel: "System", id: 7023}
```

### Save the parsed events

Store the parsed events as compressed JSON for later analysis:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Security.evtx"
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
this = data.parse_winlog()
to_file "security.json.gz" {
  write_ndjson
  compress_gzip
}
```

### Map events to OCSF

[Install the Microsoft package](../../guides/packages/install-a-package.md) to map the events to OCSF. The `microsoft::windows::ocsf::normalize` operator takes the event XML directly, so it replaces [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md). Count the resulting OCSF classes:

```tql
shell "evtx_dump --threads 1 --format xml --dont-show-record-number --no-indent Security.evtx"
read_delimited "</Event>\n", include_separator=true
data = data.replace_regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "")
microsoft::windows::ocsf::normalize data
ocsf_derive
summarize class_name, events=count()
sort -events
head 4
```

```tql
{class_name: "Entity Management", events: 725}
{class_name: "Authentication", events: 675}
{class_name: "Authorize Session", events: 459}
{class_name: "Base Event", events: 236}
```
