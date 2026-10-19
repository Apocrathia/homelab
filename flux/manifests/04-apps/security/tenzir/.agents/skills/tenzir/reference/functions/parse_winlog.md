---
title: "parse_winlog"
canonical: https://tenzir.com/docs/reference/functions/parse_winlog
source: https://tenzir.com/docs/reference/functions/parse_winlog.md
section: "Docs"
---

# parse_winlog

> Parses a string as a Windows Event Log XML record.

Parses a string as a Windows Event Log XML record.

```tql
parse_winlog(input:string, [schema=string, selector=string,
             schema_only=bool, raw=bool, unflatten_separator=string]) -> record
```

## Description

The `parse_winlog` function parses a string containing Windows Event Log XML and converts it into a structured record. This function is optimized for the [Windows XML Event Log format](https://learn.microsoft.com/en-us/windows/win32/wes/eventschema-schema) and preserves the original XML element names.

The function handles the following Windows Event XML sections:

* **System** - Core event metadata (Provider, EventID, Level, TimeCreated, etc.)

* **EventData** - Event-specific data, formatted based on content:

  * Named `<Data Name="...">` elements become record fields
  * Unnamed `<Data>` elements become a list

* **UserData** - Alternative event data section (preserved as nested structure)

* **RenderingInfo** - Human-readable rendered strings

### `input: string`

The Windows Event Log XML string to parse. This is typically the XML output from `wevtutil`, forwarded Windows events, or exported `.evtx` files converted to XML.

### `raw = bool (optional)`

Use only the raw types that are native to the parsed format. Fields that have a type specified in the chosen `schema` will still be parsed according to the schema.

### `schema = string (optional)`

Provide the name of a schema to be used by the parser.

If a schema with a matching name is installed, the result will always have all fields from that schema.

* Fields that are specified in the schema, but did not appear in the input will be null.
* Fields that appear in the input, but not in the schema will also be kept. Use `schema_only=true` to reject fields that are not in the schema.

If the given schema does not exist, this option instead assigns the output schema name only.

The `schema` option is incompatible with the `selector` option.

### `selector = string (optional)`

Designates a field value as schema name with an optional dot-separated prefix.

The string is parsed as `<fieldname>[:<prefix>]`. The `prefix` is optional and will be prepended to the field value to generate the schema name.

For example, the Suricata EVE JSON format includes a field `event_type` that contains the event type. Setting the selector to `event_type:suricata` causes an event with the value `flow` for the field `event_type` to map onto the schema `suricata.flow`.

The `selector` option is incompatible with the `schema` option.

### `schema_only = bool (optional)`

When working with an existing schema, this option will ensure that the output schema has *only* the fields from that schema.

If the schema name is obtained via a `selector` and it does not exist, this has no effect.

This option requires either `schema` or `selector` to be set.

### `unflatten_separator = string (optional)`

A delimiter that, if present in keys, causes values to be treated as values of nested records.

A popular example of this is the [Zeek JSON](../operators/read_zeek_json.md) format. It includes the fields `id.orig_h`, `id.orig_p`, `id.resp_h`, and `id.resp_p` at the top-level. The data is best modeled as an `id` record with four nested fields `orig_h`, `orig_p`, `resp_h`, and `resp_p`.

Without an unflatten separator, the data looks like this:

Without unflattening

```json
{
  "id.orig_h": "1.1.1.1",
  "id.orig_p": 10,
  "id.resp_h": "1.1.1.2",
  "id.resp_p": 5
}
```

With the unflatten separator set to `.`, Tenzir reads the events like this:

With 'unflatten'

```json
{
  "id": {
    "orig_h": "1.1.1.1",
    "orig_p": 10,
    "resp_h": "1.1.1.2",
    "resp_p": 5
  }
}
```

### Duplicate Keys

If the parser encounters a duplicate key in an event, it will transparently upgrade the field to be a list of values instead.

For a simple example, consider this JSON file:

Duplicate Keys

```json
{"key": 7}
{"key": 0.0, "key": 1}
{"key": 42}
```

```tql
{key: 7}
{key: [0.0, 1]}
{key: 42}
```

The values keep their individual types, so the list can mix values of different types:

Mixed Types

```json
{"key": 0.0, "key": "1.1.1.1", "key": "example.com"}
```

```tql
{key: [0.0, 1.1.1.1, "example.com"]}
```

When you provide a `schema` or `selector`, the last value of a repeated key wins instead.

## Output Schema

The output record preserves the Windows Event XML structure. Fields that are not present in the input XML are omitted from the output.

Show full schema

```tql
{
  System: {
    Provider: {
      Name: string,
      Guid: string,
      EventSourceName: string,
    },
    EventID: int,
    Version: int,
    Level: int,
    Task: int,
    Opcode: int,
    Keywords: string,
    TimeCreated: {
      SystemTime: time,
    },
    EventRecordID: int,
    Correlation: {
      ActivityID: string,
      RelatedActivityID: string,
    },
    Execution: {
      ProcessID: int,
      ThreadID: int,
    },
    Channel: string,
    Computer: string,
    Security: {
      UserID: string,
    },
  },
  EventData: {
    // Named <Data Name="..."> elements → record fields
    // OR: Unnamed <Data> elements → list of strings
  },
  UserData: {
    // Preserved as nested structure
  },
  RenderingInfo: {
    Message: string,
    Level: string,
    Task: string,
    Opcode: string,
    Keywords: [string],
    Channel: string,
    Provider: string,
  },
}
```

## Examples

### Parse a Windows Security event

This example uses a real [Event 4688](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/event-4688) (process creation) from Microsoft’s Security Auditing documentation:

```tql
from {
  xml: r#"<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-A5BA-3E3B0328C30D}" />
    <EventID>4688</EventID>
    <Version>2</Version>
    <Level>0</Level>
    <Task>13312</Task>
    <Opcode>0</Opcode>
    <Keywords>0x8020000000000000</Keywords>
    <TimeCreated SystemTime="2015-11-12T02:24:52.377352500Z" />
    <EventRecordID>2814</EventRecordID>
    <Correlation />
    <Execution ProcessID="4" ThreadID="400" />
    <Channel>Security</Channel>
    <Computer>WIN-GG82ULGC9GO.contoso.local</Computer>
    <Security />
  </System>
  <EventData>
    <Data Name="SubjectUserSid">S-1-5-18</Data>
    <Data Name="SubjectUserName">WIN-GG82ULGC9GO$</Data>
    <Data Name="SubjectDomainName">CONTOSO</Data>
    <Data Name="SubjectLogonId">0x3e7</Data>
    <Data Name="NewProcessId">0x2bc</Data>
    <Data Name="NewProcessName">C:\Windows\System32\rundll32.exe</Data>
    <Data Name="TokenElevationType">%%1938</Data>
    <Data Name="ProcessId">0xe74</Data>
    <Data Name="CommandLine"></Data>
    <Data Name="TargetUserSid">S-1-5-21-1377283216-344919071-3415362939-1104</Data>
    <Data Name="TargetUserName">dadmin</Data>
    <Data Name="TargetDomainName">CONTOSO</Data>
    <Data Name="TargetLogonId">0x4a5af0</Data>
    <Data Name="ParentProcessName">C:\Windows\explorer.exe</Data>
    <Data Name="MandatoryLabel">S-1-16-8192</Data>
  </EventData>
</Event>"#
}
output = xml.parse_winlog()
```

```tql
{
  output: {
    System: {
      Channel: "Security",
      Computer: "WIN-GG82ULGC9GO.contoso.local",
      Correlation: null,
      EventID: 4688,
      EventRecordID: 2814,
      Execution: {
        ProcessID: 4,
        ThreadID: 400,
      },
      Keywords: "0x8020000000000000",
      Level: 0,
      Opcode: 0,
      Provider: {
        Name: "Microsoft-Windows-Security-Auditing",
        Guid: "{54849625-5478-4994-A5BA-3E3B0328C30D}",
      },
      Security: null,
      Task: 13312,
      TimeCreated: {
        SystemTime: 2015-11-12T02:24:52.377352500Z,
      },
      Version: 2,
    },
    EventData: {
      SubjectUserSid: "S-1-5-18",
      SubjectUserName: "WIN-GG82ULGC9GO$",
      SubjectDomainName: "CONTOSO",
      SubjectLogonId: "0x3e7",
      NewProcessId: "0x2bc",
      NewProcessName: "C:\\Windows\\System32\\rundll32.exe",
      TokenElevationType: "%%1938",
      ProcessId: "0xe74",
      CommandLine: null,
      TargetUserSid: "S-1-5-21-1377283216-344919071-3415362939-1104",
      TargetUserName: "dadmin",
      TargetDomainName: "CONTOSO",
      TargetLogonId: "0x4a5af0",
      ParentProcessName: "C:\\Windows\\explorer.exe",
      MandatoryLabel: "S-1-16-8192",
    },
  },
}
```

### Parse events with unnamed Data elements

When `EventData` contains unnamed `<Data>` elements (without `Name` attributes), the output is a list instead of a record:

```tql
from {
  xml: r#"<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Application"/>
    <EventID>1000</EventID>
    <Level>2</Level>
    <TimeCreated SystemTime="2024-01-15T09:00:00.000Z"/>
    <Channel>Application</Channel>
    <Computer>SERVER1</Computer>
  </System>
  <EventData>
    <Data>MyApp.exe</Data>
    <Data>1.0.0.0</Data>
  </EventData>
</Event>"#
}
output = xml.parse_winlog()
drop xml
```

```tql
{
  output: {
    System: {
      Channel: "Application",
      Computer: "SERVER1",
      EventID: 1000,
      Level: 2,
      Provider: {
        Name: "Application",
      },
      TimeCreated: {
        SystemTime: 2024-01-15T09:00:00.000Z,
      },
    },
    EventData: [
      "MyApp.exe",
      "1.0.0.0",
    ],
  },
}
```

### Parse a Windows event from a file

```tql
from_file "windows_events.xml" {
  read_delimited "</Event>\n", include_separator=true
}
this = data.parse_winlog()
where System.EventID in [4624, 4625]
```

## See Also

* [`parse_xml`](https://tenzir.com/docs/reference/functions/parse_xml.md)
* [`parse_syslog`](https://tenzir.com/docs/reference/functions/parse_syslog.md)
* [Microsoft Windows Event Logs](../../integrations/microsoft/windows-event-logs.md)
