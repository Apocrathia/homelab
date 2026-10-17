---
title: "read_syslog"
canonical: https://tenzir.com/docs/reference/operators/read_syslog
source: https://tenzir.com/docs/reference/operators/read_syslog.md
section: "Docs"
---

# read_syslog

> Parses an incoming Syslog stream into events.

Parses an incoming Syslog stream into events.

```tql
read_syslog [octet_counting=bool, raw_message=field, merge=bool, raw=bool, schema=string, selector=string, schema_only=bool, unflatten_separator=string]
```

## Description

[Syslog](https://en.wikipedia.org/wiki/Syslog) is a standard format for message logging.

Tenzir supports reading syslog messages in both the standardized “Syslog Protocol” format ([RFC 5424](https://tools.ietf.org/html/rfc5424)), and the older “BSD syslog Protocol” format ([RFC 3164](https://tools.ietf.org/html/rfc3164)).

It also accepts common Check Point structured-data variants, including `key:"value"` parameters, semicolon separators, and messages with no SD-ID.

Depending on the syslog format, the result can be different. Here’s an example of a syslog message in RFC 5424 format:

```plaintext
<165>8 2023-10-11T22:14:15.003Z mymachineexamplecom evntslog 1370 ID47 [exampleSDID@32473 eventSource="Application" eventID="1011"] Event log entry
```

With this input, the parser will produce the following output, with the schema name `syslog.rfc5424`:

```tql
{
  input: "<165>8 2023-10-11T22:14:15.003Z mymachineexamplecom evntslog 1370 ID47 [exampleSDID@32473 eventSource=\"Application\" eventID=\"1011\"] Event log entry",
  output: {
    facility: 20,
    severity: 5,
    version: 8,
    timestamp: 2023-10-11T22:14:15.003Z,
    hostname: "mymachineexamplecom",
    app_name: "evntslog",
    process_id: "1370",
    message_id: "ID47",
    structured_data: {
      "exampleSDID@32473": {
        eventSource: "Application",
        eventID: 1011,
      },
    },
    message: "Event log entry",
  },
}
```

Here’s an example of a syslog message in RFC 3164 format:

```plaintext
<34>Nov 16 14:55:56 mymachine PROGRAM: Freeform message
```

With this input, the parser will produce the following output, with the schema name `syslog.rfc3164`:

```json
{
  "facility": 4,
  "severity": 2,
  "timestamp": "Nov 16 14:55:56",
  "hostname": "mymachine",
  "app_name": "PROGRAM",
  "process_id": null,
  "content": "Freeform message"
}
```

RFC 3164 timestamps don’t include a year or timezone, so `read_syslog` keeps the timestamp as a string. Use [`parse_time`](https://tenzir.com/docs/reference/functions/parse_time.md) with `reference` to convert it to a timestamp. See [`parse_time`](https://tenzir.com/docs/reference/functions/parse_time.md) for examples with fixed references and timezone offsets.

Pipeline

```tql
from_file "syslog.txt" {
  read_syslog
}
timestamp = timestamp.parse_time("%b %e %H:%M:%S", reference=now())
```

Some RFC 3164 emitters prepend structured-data blocks to the message content using syntax similar to RFC 5424. When the parser detects valid structured data at the start of the content field, it extracts the key-value pairs into a `structured_data` field and stores the remaining text in `content`. These events use the schema name `syslog.rfc3164.structured`:

```plaintext
<166>2026-02-11T18:01:45.587Z myhost Hostd[2099494]: [Originator@6876 sub=Vimsvc.TaskManager opID=23d59ade] Task Completed
```

```tql
{
  facility: 20,
  severity: 6,
  timestamp: "2026-02-11T18:01:45.587Z",
  hostname: "myhost",
  app_name: "Hostd",
  process_id: "2099494",
  structured_data: {
    "Originator@6876": {
      sub: "Vimsvc.TaskManager",
      opID: "23d59ade",
    },
  },
  content: "Task Completed",
}
```

If the leading brackets don’t contain valid structured data, the parser leaves the content intact and uses the regular `syslog.rfc3164` schema.

### `octet_counting = bool (optional)`

Controls handling of length-prefixed syslog messages as defined in [RFC 6587](https://datatracker.ietf.org/doc/html/rfc6587#section-3.4.1). Some syslog implementations prepend the message length in bytes, followed by a space:

```plaintext
<length> <syslog-message>
```

For example, where `65` is the byte count of the syslog message that follows:

```plaintext
65 <165>1 2023-10-11T22:14:15.003Z host app 1234 ID01 - Test message
```

The parameter supports two modes:

* **`octet_counting=false` (default)**: Split the stream at newlines and don’t interpret a leading length prefix.
* **`octet_counting=true`**: Frame the stream using the declared message lengths. A missing or invalid length prefix stops the parser with an error.

### `raw_message = field (optional)`

Stores the original, unparsed syslog message in the specified field.

For multi-line messages, the raw message includes all lines joined with newlines.

### `merge = bool (optional)`

This option has no effect and only exists for backward compatibility. Tenzir keeps events with different schemas in the same batch, so heterogeneous input needs no merging.

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

A popular example of this is the [Zeek JSON](read_zeek_json.md) format. It includes the fields `id.orig_h`, `id.orig_p`, `id.resp_h`, and `id.resp_p` at the top-level. The data is best modeled as an `id` record with four nested fields `orig_h`, `orig_p`, `resp_h`, and `resp_p`.

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

## Examples

### Read in the `auth.log`

Pipeline

```tql
from_file "/var/log/auth.log" {
  read_syslog
}
```

```tql
{
  facility: null,
  severity: null,
  timestamp: 2024-10-14T07:15:01.348027,
  hostname: "tenzirs-magic-machine",
  app_name: "CRON",
  process_id: "895756",
  content: "pam_unix(cron:session): session opened for user root(uid=0) by root(uid=0)",
}
{
  facility: null,
  severity: null,
  timestamp: 2024-10-14T07:15:01.349838,
  hostname: "tenzirs-magic-machine",
  app_name: "CRON",
  process_id: "895756",
  content: "pam_unix(cron:session): session closed for user root"
}
```

### Parse octet-counted syslog over TCP

When receiving Syslog over TCP from systems that use RFC 6587 octet counting, enable length-based framing explicitly:

Pipeline

```tql
accept_tcp "0.0.0.0:514" {
  read_syslog octet_counting=true
}
```

Omit the option for newline-delimited Syslog streams.

### Parse Check Point structured data variants

Some Check Point exports use a structured-data dialect that differs from RFC 5424. `read_syslog` supports common variants such as `key:"value"` parameters, semicolon separators, and records that omit the SD-ID.

When an SD-ID is missing, Tenzir stores the parameters under `structured_data.checkpoint_2620`:

checkpoint.txt

```txt
<134>1 2026-02-25T08:14:51Z fwmgt CheckPoint 10024 - [action:"Accept"; conn_direction:"Incoming"; flags:"8667398"]
```

Pipeline

```tql
from_file "checkpoint.txt" {
  read_syslog
}
```

```tql
{
  facility: 16,
  severity: 6,
  version: 1,
  timestamp: 2026-02-25T08:14:51Z,
  hostname: "fwmgt",
  app_name: "CheckPoint",
  process_id: "10024",
  message_id: null,
  structured_data: {
    checkpoint_2620: {
      action: "Accept",
      conn_direction: "Incoming",
      flags: 8667398,
    },
  },
  message: null,
}
```

### Parse RFC 3164 messages with structured data

Some legacy syslog emitters, such as VMware ESXi, prepend structured-data blocks to the message content. The parser extracts them automatically:

Pipeline

```tql
from {
  line: r#"<166>2026-02-11T18:01:45.587Z myhost Hostd[2099494]: [Originator@6876 sub=Vimsvc.TaskManager opID=23d59ade] Task Completed"#,
}
write_lines
read_syslog
```

```tql
{
  facility: 20,
  severity: 6,
  timestamp: "2026-02-11T18:01:45.587Z",
  hostname: "myhost",
  app_name: "Hostd",
  process_id: "2099494",
  structured_data: {
    "Originator@6876": {
      sub: "Vimsvc.TaskManager",
      opID: "23d59ade",
    },
  },
  content: "Task Completed",
}
```

### Preserve the original message

Use `raw_message` to keep the unparsed syslog line alongside the parsed fields:

Pipeline

```tql
from_file "/var/log/auth.log" {
  read_syslog raw_message=raw
}
```

```tql
{
  facility: null,
  severity: null,
  timestamp: 2024-10-14T07:15:01.348027,
  hostname: "tenzirs-magic-machine",
  app_name: "CRON",
  process_id: "895756",
  content: "pam_unix(cron:session): session opened for user root(uid=0) by root(uid=0)",
  raw: "Oct 14 07:15:01 tenzirs-magic-machine CRON[895756]: pam_unix(cron:session): session opened for user root(uid=0) by root(uid=0)",
}
```

## See Also

* [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md)
* [`parse_syslog`](https://tenzir.com/docs/reference/functions/parse_syslog.md)
* [Syslog](../../integrations/syslog.md)
