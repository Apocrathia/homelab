---
title: "Syslog integration"
description: "Send and receive Syslog over UDP, TCP, and RELP."
canonical: https://tenzir.com/integrations/syslog
source: https://tenzir.com/integrations/syslog.md
section: "Integrations"
---

# Syslog integration

> Send and receive Syslog over UDP, TCP, and RELP.

Tenzir supports parsing Syslog messages from transport protocols such as UDP, TCP, and [RELP](relp.md), and emitting Syslog-formatted byte streams. This enables seamless integration with Syslog-based systems for ingesting or exporting logs.

Syslog

Syslog support in Tenzir is powered by two components:

* [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md): a parser that turns unstructured Syslog messages into structured events.
* [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md): a printer that transforms structured events into compliant Syslog messages.

Together, these building blocks enable round-trip Syslog processing.

## Examples

### Create a Syslog Server

To receive Syslog messages on a UDP socket, use [`accept_udp`](https://tenzir.com/docs/reference/operators/accept_udp.md):

```tql
accept_udp "0.0.0.0:514"
this = data.parse_syslog()
publish "syslog"
```

To use TCP instead of UDP, use [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) with [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md):

```tql
accept_tcp "0.0.0.0:514" {
  read_syslog
}
publish "syslog"
```

The pipeline inside [`accept_tcp`](https://tenzir.com/docs/reference/operators/accept_tcp.md) executes *for each accepted connection*.

For senders that require application-level acknowledgements, use our [RELP](relp.md) integration. To configure an rsyslog sender with RELP, retries, and persistent queues, see our [rsyslog](rsyslog.md) integration.

### Parsing CEF, LEEF, or JSON Payloads

If your Syslog messages embed structured formats like CEF, LEEF, or JSON, you can follow up with an additional parser. For example, assume you have a Syslog message that includes CEF:

```txt
Nov 13 16:00:02 host123 FOO: CEF:0|FORCEPOINT|Firewall|6.6.1|78002|TLS connection state|0|deviceExternalId=Master FW node 1 dvc=10.1.1.40 dvchost=10.1.1.40 msg=TLS: Couldn't establish TLS connection (11, N/A) deviceFacility=Management rt=Jan 17 2020 08:52:09
```

When you throw [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md) at this line, you’ll get this output:

sample.syslog

```tql
{
  facility: null,
  severity: null,
  timestamp: "Nov 13 16:00:02",
  hostname: "host123",
  app_name: "FOO",
  process_id: null,
  content: "CEF:0|FORCEPOINT|Firewall|6.6.1|78002|TLS connection state|0|deviceExternalId=Master FW node 1 dvc=10.1.1.40 dvchost=10.1.1.40 msg=TLS: Couldn't establish TLS connection (11, N/A) deviceFacility=Management rt=Jan 17 2020 08:52:09",
}
```

Note that the `content` field is just a big string. Parse it with [`parse_cef`](https://tenzir.com/docs/reference/functions/parse_cef.md):

```tql
from_file "/tmp/sample.syslog" {
  read_syslog
}
content = content.parse_cef()
```

This yields the following structured output:

```tql
{
  facility: null,
  severity: null,
  timestamp: "Nov 13 16:00:02",
  hostname: "host123",
  app_name: "FOO",
  process_id: null,
  content: {
    cef_version: 0,
    device_vendor: "FORCEPOINT",
    device_product: "Firewall",
    device_version: "6.6.1",
    signature_id: "78002",
    name: "TLS connection state",
    severity: "0",
    extension: {
      deviceExternalId: "Master FW node 1",
      dvc: 10.1.1.40,
      dvchost: 10.1.1.40,
      msg: "TLS: Couldn't establish TLS connection (11, N/A)",
      deviceFacility: "Management",
      rt: "Jan 17 2020 08:52:09",
    },
  },
}
```

### Handling Multi-line Syslog Messages

Tenzir’s Syslog parser supports multi-line messages using a heuristic:

1. Split the input at newlines.
2. Try parsing the next line as a new Syslog message.
3. If successful, treat it as a new message.
4. If parsing fails, append the line to the current message and repeat.

This allows ingesting logs with stack traces or other verbose content correctly.

### Preserving the Original Message

For auditing, compliance, or debugging purposes, you may need to keep the original syslog line alongside the parsed fields. Use the `raw_message` parameter to store the unparsed input:

```tql
accept_tcp "0.0.0.0:514" {
  read_syslog raw_message=raw
}
```

This adds a `raw` field containing the complete original message, including any multi-line content:

```tql
{
  facility: 4,
  severity: 2,
  timestamp: "Nov 16 14:55:56",
  hostname: "mymachine",
  app_name: "PROGRAM",
  process_id: null,
  content: "Freeform message",
  raw: "<34>Nov 16 14:55:56 mymachine PROGRAM: Freeform message",
}
```

### RFC 6587 Octet Counting

When receiving syslog over TCP, some implementations use [RFC 6587](https://datatracker.ietf.org/doc/html/rfc6587#section-3.4.1) octet counting to frame messages. Instead of relying on newlines, each message is prefixed with its length in bytes:

```plaintext
65 <165>1 2023-10-11T22:14:15.003Z host app 1234 ID01 - Test message
```

Here, `65` is the byte count of the syslog message that follows.

[`parse_syslog`](https://tenzir.com/docs/reference/functions/parse_syslog.md) auto-detects an RFC 6587 prefix when parsing an individual string. For streaming input, [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md) uses newline framing by default. Set `octet_counting=true` to make [`read_syslog`](https://tenzir.com/docs/reference/operators/read_syslog.md) require RFC 6587 length prefixes and use them as message boundaries.

### RFC 3164 messages with structured data

Some legacy syslog emitters, such as VMware ESXi, prepend RFC 5424-style structured-data blocks to the message content. Tenzir detects these automatically and extracts the key-value pairs into a `structured_data` field. Events with extracted structured data use the schema `syslog.rfc3164.structured` while ordinary RFC 3164 events keep the `syslog.rfc3164` schema.

### Check Point structured data compatibility

Some Check Point exports use structured-data syntax that differs from RFC 5424, for example `key:"value"` parameters and semicolon separators. Tenzir supports these variants in both `read_syslog` and `parse_syslog`.

When a record omits the SD-ID, Tenzir stores the parsed parameters under `structured_data.checkpoint_2620`.

## Emit Events as Syslog

Tenzir also supports **creating** Syslog messages from structured events via [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md).

Here’s a basic example that emits a single Syslog line over TCP:

```tql
from {
  facility: 3,
  severity: 6,
  timestamp: 2020-03-02T18:44:46,
  hostname: "parallels-Parallels-Virtual-Platform",
  app_name: "packagekitd",
  process_id: "1370",
  message_id: "",
  structured_data: {},
  message: " PARENT process running...",
}
to_tcp "1.2.3.4:514" {
  write_syslog
}
```

This pipeline sends the following RFC 5424-formatted message to `1.2.3.4:514/tcp`:

```txt
<30>1 2020-03-02T18:44:46.000000Z parallels-Parallels-Virtual-Platform packagekitd 1370 - -  PARENT process running...
```

### Example with Structured Data

Here is a richer event with structured Syslog fields. Let’s create a Syslog event from it:

```tql
from {
  facility: 20,
  severity: 5,
  version: 8,
  timestamp: 2003-10-11T22:14:15,
  hostname: "mymachineexamplecom",
  app_name: "evntslog",
  process_id: "",
  message_id: "ID47",
  structured_data: {
    "exampleSDID@32473": {
      iut: 5,
      eventSource: "Applic\\ation",
      eventID: 1011,
    },
    "examplePriority@32473": {
      class: "high",
    },
  },
  message: null,
}
write_syslog
```

Output:

```txt
<165>1 2003-10-11T22:14:15.000000Z mymachineexamplecom evntslog - ID47 [exampleSDID@32473 iut="5" eventSource="Applic\\ation" eventID="1011"][examplePriority@32473 class="high"]
```

The [`write_syslog`](https://tenzir.com/docs/reference/operators/write_syslog.md) operator converts the `structured_data` field into a valid [RFC 5424](https://datatracker.ietf.org/doc/html/rfc5424) structured block.
