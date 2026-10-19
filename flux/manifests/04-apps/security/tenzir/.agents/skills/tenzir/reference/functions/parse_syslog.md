---
title: "parse_syslog"
canonical: https://tenzir.com/docs/reference/functions/parse_syslog
source: https://tenzir.com/docs/reference/functions/parse_syslog.md
section: "Docs"
---

# parse_syslog

> Parses a string as a Syslog message.

Parses a string as a Syslog message.

```tql
parse_syslog [octet_counting=bool, raw=bool, schema=string, selector=string,
              schema_only=bool, unflatten_separator=string]
```

## Description

Parses a string as a [Syslog](https://en.wikipedia.org/wiki/Syslog) message.

Tenzir supports reading syslog messages in both the standardized “Syslog Protocol” format ([RFC 5424](https://tools.ietf.org/html/rfc5424)), and the older “BSD syslog Protocol” format ([RFC 3164](https://tools.ietf.org/html/rfc3164)).

### `input: string`

The string to parse as a syslog message.

### `octet_counting = bool (optional)`

Controls handling of length-prefixed syslog messages as defined in [RFC 6587](https://datatracker.ietf.org/doc/html/rfc6587#section-3.4.1). Some syslog implementations prepend the message length in bytes, followed by a space:

```plaintext
<length> <syslog-message>
```

For example, where `65` is the byte count of the syslog message that follows:

```plaintext
65 <165>1 2023-10-11T22:14:15.003Z host app 1234 ID01 - Test message
```

The parameter supports three modes:

* **Not specified (default)**: Auto-detect. Treats the length prefix as a hint, not an authority. The parser first tries to parse the full message; if that fails and a valid prefix is present, it falls back to parsing the truncated message. This maximizes leniency for messages that happen to start with digits.
* **`octet_counting=true`**: Require and trust the length prefix. Emits a warning and returns null if the input lacks a valid prefix. If the message is longer than the stated length, truncates to the stated length before parsing.
* **`octet_counting=false`**: Never strip a length prefix. Parse the input as-is, treating any leading digits as part of the message.

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

## Examples

### Parse a RFC5424 syslog string

```tql
from { input: r#"<165>8 2023-10-11T22:14:15.003Z mymachineexamplecom evntslog 1370 ID47 [exampleSDID@32473 eventSource="Application" eventID="1011"] Event log entry"#}
output = input.parse_syslog()
```

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

### Parse an octet-counted syslog message

When dealing with syslog messages that use RFC 6587 octet counting, the function auto-detects and strips the length prefix:

```tql
from {
  input: "119 <165>1 2023-10-11T22:14:15.003Z mymachineexamplecom evntslog 1370 ID47 [exampleSDID@32473 iut=\"3\"] Event log entry"
}
output = input.parse_syslog()
```

```tql
{
  input: "119 <165>1 2023-10-11T22:14:15.003Z mymachineexamplecom evntslog 1370 ID47 [exampleSDID@32473 iut=\"3\"] Event log entry",
  output: {
    facility: 20,
    severity: 5,
    version: 1,
    timestamp: 2023-10-11T22:14:15.003Z,
    hostname: "mymachineexamplecom",
    app_name: "evntslog",
    process_id: "1370",
    message_id: "ID47",
    structured_data: {
      "exampleSDID@32473": {
        iut: 3,
      },
    },
    message: "Event log entry",
  },
}
```

### Parse Check Point structured data variants

Some Check Point exports use a structured-data dialect that differs from RFC 5424. Tenzir supports the common variants, including `key:"value"` parameters, semicolon separators, and records that omit the SD-ID.

When an SD-ID is missing, Tenzir stores the parameters under `structured_data.checkpoint_2620`:

```tql
from {
  input: r#"<134>1 2026-02-25T08:14:51Z fwmgt CheckPoint 10024 - [action:"Accept"; conn_direction:"Incoming"; flags:"8667398"]"#,
}
output = input.parse_syslog()
```

```tql
{
  input: "<134>1 2026-02-25T08:14:51Z fwmgt CheckPoint 10024 - [action:\"Accept\"; conn_direction:\"Incoming\"; flags:\"8667398\"]",
  output: {
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
  },
}
```

Use `octet_counting=true` to require the prefix or `octet_counting=false` to disable auto-detection.

### Parse RFC 3164 messages with structured data

Some legacy syslog emitters prepend structured-data blocks to the message content. The function extracts them into a `structured_data` field and stores the remaining text in `content`:

```tql
from {
  input: r#"<166>2026-02-11T18:01:45.587Z myhost Hostd[2099494]: [Originator@6876 sub=Vimsvc.TaskManager opID=23d59ade] Task Completed"#,
}
output = input.parse_syslog()
```

```tql
{
  input: "<166>2026-02-11T18:01:45.587Z myhost Hostd[2099494]: [Originator@6876 sub=Vimsvc.TaskManager opID=23d59ade] Task Completed",
  output: {
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
  },
}
```

If the leading brackets don’t contain valid structured data, the parser leaves the content intact and omits the `structured_data` field.

### Parse an RFC 3164 timestamp

RFC 3164/BSD syslog timestamps don’t include a year or timezone, so `parse_syslog` keeps the timestamp as a string. Use [`parse_time`](https://tenzir.com/docs/reference/functions/parse_time.md) with a `reference` timestamp to convert it after parsing the syslog message. See [`parse_time`](https://tenzir.com/docs/reference/functions/parse_time.md) for examples with `now()`, fixed references, and timezone offsets.

## See Also

* [`parse_time`](https://tenzir.com/docs/reference/functions/parse_time.md)
* [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md)
* [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md)
* [Syslog](../../integrations/syslog.md)
