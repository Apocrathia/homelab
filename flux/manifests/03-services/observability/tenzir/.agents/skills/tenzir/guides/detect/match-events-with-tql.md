---
title: "Match events with TQL"
description: "Write single-event detections over OCSF events and package their matching and output logic as reusable TQL operators"
canonical: https://tenzir.com/docs/guides/detect/match-events-with-tql
source: https://tenzir.com/docs/guides/detect/match-events-with-tql.md
section: "Docs"
---

# Match events with TQL

> Write single-event detections over OCSF events and package their matching and output logic as reusable TQL operators

This guide shows you how to write detections directly in TQL. A single-event detection is a predicate: [`where`](https://tenzir.com/docs/reference/operators/where.md) keeps matching events and drops the rest. Writing the predicate natively keeps your events in their canonical shape, with no taxonomy translation and no rule-format limitations between you and the data.

Why a query language for detections?

Most detections in practice are standard queries: filter an event stream on a few fields, compare strings, count occurrences. Query languages are a great fit for expressing them, and the Microsoft ecosystem shows how far that scales: KQL powers a thriving community that shares detections by the thousands. TQL performs the same transformations directly in the pipeline, and its tight integration with OCSF and the surrounding security tooling makes it a strong fit for security operations beyond detection alone: the same language collects, normalizes, enriches, and routes.

The examples use OCSF events. Every example shows only the fields the detection reads. They progress from simple field comparisons to regular expressions, membership tests, and event lists before packaging the matching and output logic as a reusable detection.

## Filter by event type and fields

The detection primitive is [`where`](https://tenzir.com/docs/reference/operators/where.md) with a boolean expression. Gate on `class_uid` first so class-specific fields are only touched on events that have them, then compare the fields relevant to the detection:

```tql
from {
  time: 2026-07-01T12:00:00Z,
  class_uid: 1007,
  activity_id: 1,
  device: {hostname: "ws-17"},
  process: {
    name: "PowerShell.EXE",
    cmd_line: "powershell.exe -NoP -EncodedCommand SQBFAFgA",
  },
}, {
  time: 2026-07-01T12:01:00Z,
  class_uid: 1007,
  activity_id: 1,
  device: {hostname: "ws-17"},
  process: {
    name: "notepad.exe",
    cmd_line: "notepad.exe C:\\Users\\alice\\notes.txt",
  },
}
// class_name: "Process Activity", activity_name: "Launch"
where class_uid == 1007 and activity_id == 1
where process.name.equals("powershell.exe", ignore_case=true) \
  and process.cmd_line.search("-encodedcommand", ignore_case=true)
```

```tql
{
  time: 2026-07-01T12:00:00Z,
  class_uid: 1007,
  activity_id: 1,
  device: {
    hostname: "ws-17",
  },
  process: {
    name: "PowerShell.EXE",
    cmd_line: "powershell.exe -NoP -EncodedCommand SQBFAFgA",
  },
}
```

Two details matter for OCSF data:

* **Match on numeric identifiers.** `class_uid == 1007` and `activity_id == 1` select OCSF Process Activity launch events. The sibling labels (`class_name`, `activity_name`) are display fields; detection logic keys on the stable integers.
* **Compare strings case-insensitively.** OCSF preserves vendor casing, so Windows process names can arrive as `PowerShell.EXE` or `powershell.exe`. [`equals`](https://tenzir.com/docs/reference/functions/equals.md), [`search`](https://tenzir.com/docs/reference/functions/search.md), [`starts_with`](https://tenzir.com/docs/reference/functions/starts_with.md), and [`ends_with`](https://tenzir.com/docs/reference/functions/ends_with.md) all take `ignore_case=true`.

Handle optional fields

OCSF events may omit fields. Gate on `class_uid` before reading class-specific fields. For optional fields, use `?` and compare the result to `true` so [`where`](https://tenzir.com/docs/reference/operators/where.md) receives a boolean:

```tql
// class_name: "Process Activity"
where class_uid == 1007 and process.cmd_line?.search("-enc") == true
```

## Build richer predicates

Regular expressions, membership tests, and list transformations extend the same boolean matching logic to more complex values and event structures.

### Match strings with regular expressions

Use [`match_regex`](https://tenzir.com/docs/reference/functions/match_regex.md) when substring checks are not precise enough. The `(?i)` prefix makes the pattern case-insensitive:

```tql
from {
  time: 2026-07-01T12:00:00Z,
  class_uid: 1007,
  activity_id: 1,
  process: {cmd_line: "powershell.exe -NoP -EncodedCommand SQBFAFgA"},
}, {
  time: 2026-07-01T12:01:00Z,
  class_uid: 1007,
  activity_id: 1,
  process: {cmd_line: "powershell.exe -enc SQBFAFgA"},
}, {
  time: 2026-07-01T12:02:00Z,
  class_uid: 1007,
  activity_id: 1,
  process: {cmd_line: "powershell.exe -File C:\\scripts\\backup.ps1"},
}
// class_name: "Process Activity", activity_name: "Launch"
where class_uid == 1007 and activity_id == 1
where process.cmd_line.match_regex(r"(?i)\s-enc(odedcommand)?\s")
select time, cmd_line=process.cmd_line
```

```tql
{
  time: 2026-07-01T12:00:00Z,
  cmd_line: "powershell.exe -NoP -EncodedCommand SQBFAFgA",
}
{
  time: 2026-07-01T12:01:00Z,
  cmd_line: "powershell.exe -enc SQBFAFgA",
}
```

The pattern catches both the short `-enc` and the long `-EncodedCommand` spelling while the benign script invocation passes through untouched. Raw string literals (`r"..."`) keep backslashes literal, which you will appreciate when matching Windows paths: `r"\\config\\sam"` instead of `"\\\\config\\\\sam"`.

### Match values and network ranges

The `in` operator tests membership in lists and CIDR blocks. Define shared constants with `let` so the detection reads declaratively:

```tql
let $c2_ports = [4444, 1337]


from {
  time: 2026-07-01T12:00:00Z,
  class_uid: 4001,
  activity_id: 1,
  src_endpoint: {ip: 10.0.0.5},
  dst_endpoint: {ip: 203.0.113.10, port: 4444},
}, {
  time: 2026-07-01T12:01:00Z,
  class_uid: 4001,
  activity_id: 1,
  src_endpoint: {ip: 10.0.0.5},
  dst_endpoint: {ip: 198.51.100.7, port: 443},
}
// class_name: "Network Activity"
where class_uid == 4001
where dst_endpoint.ip in 203.0.113.0/24 or dst_endpoint.port in $c2_ports
select time, src=src_endpoint.ip, dst=dst_endpoint.ip, port=dst_endpoint.port
```

```tql
{
  time: 2026-07-01T12:00:00Z,
  src: 10.0.0.5,
  dst: 203.0.113.10,
  port: 4444,
}
```

### Match values inside event lists

For fields that are themselves lists, combine [`map`](https://tenzir.com/docs/reference/functions/map.md) with [`any`](https://tenzir.com/docs/reference/functions/any.md). The OCSF `observables` array is the class-agnostic pivot for this: one predicate over `observables` serves every event class that populates it, which is how indicator matching stays independent of the event type. Here, `type_id: 8` marks an observable as a hash:

```tql
let $ioc_hashes = [
  "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
]


from {
  time: 2026-07-01T12:00:00Z,
  class_uid: 1001,
  activity_id: 1,
  file: {
    name: "invoice.pdf.exe",
    hashes: [{algorithm_id: 3, value: "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f"}],
  },
  observables: [
    {name: "file.hashes[0].value", type_id: 8, value: "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f"},
  ],
}, {
  time: 2026-07-01T12:01:00Z,
  class_uid: 1001,
  activity_id: 1,
  file: {
    name: "report.docx",
    hashes: [{algorithm_id: 3, value: "aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f"}],
  },
  observables: [
    {name: "file.hashes[0].value", type_id: 8, value: "aec070645fe53ee3b3763059376134f058cc337247c978add178b6ccdfb0019f"},
  ],
}
// observables[].type: "Hash"
where observables?.map(o => o.type_id == 8 and o.value in $ioc_hashes).any() == true
select time, file_name=file.name
```

```tql
{
  time: 2026-07-01T12:00:00Z,
  file_name: "invoice.pdf.exe",
}
```

For large indicator sets, move the list into a lookup table and use `context_enrich` instead, as the guide on [enriching with threat intelligence](../enrich/enrich-with-threat-intel.md) shows.

## Turn a match into a reusable detection

Once a predicate matches the right events, define its result and package the complete behavior for reuse.

### Choose what the detection emits

After the predicate works, choose its output contract. A detection may pass through matching events, add a verdict to each source event with the OCSF [Security Control profile](https://schema.ocsf.io/profiles/security_control), or reshape each match into an OCSF [Detection Finding](https://schema.ocsf.io/classes/detection_finding). The guide on [modeling detections in OCSF](model-detections-in-ocsf.md) explains when to use each result.

### Package the complete detection

A user-defined operator can own both the matching and output transformation. For example, package the credential-dump predicate and finding transformation together:

operators/detections/print\_sensitive\_dump.tql

```tql
// class_name: "Process Activity", activity_name: "Launch"
where class_uid == 1007 and activity_id == 1
where process.path.ends_with("\\print.exe", ignore_case=true) \
  or process.name.equals("print.exe", ignore_case=true) \
  or process.file?.internal_name?.equals("print.exe", ignore_case=true) == true
where process.cmd_line.match_regex(r"(?i)[/-]d") and process.cmd_line.match_regex(
  r"(?i)\\config\\(sam|security|system)|\\windows\\ntds\\ntds\.dit"
)
this = {
  time: now(),
  metadata: {
    product: {name: "Tenzir", vendor_name: "Tenzir"},
    uid: f"finding-create-print-dump-{device.hostname}-{time}",
    version: "1.9.0",
  },
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  severity_id: 4,
  status_id: 1,
  is_alert: true,
  finding_info: {
    uid: f"print-dump-{device.hostname}-{time}",
    title: "Sensitive File Dump Via Print.EXE",
    analytic: {
      name: "Sensitive File Dump Via Print.EXE",
      uid: "windows_threats::print_sensitive_dump",
      type_id: 1,
    },
  },
  device: device,
  evidences: [{actor: actor, process: process}],
}
type_uid = class_uid * 100 + activity_id
```

### Connect the detection to a pipeline

Keep source and destination wiring outside the reusable operator:

```tql
subscribe "ocsf.process-activity"
windows_threats::detections::print_sensitive_dump
publish "detections"
```

Split a detection into smaller operators when that improves reuse or testing, not because every operator must stop at the predicate. Windowing, correlation, and suppression can live in the detection or compose as separate stages. The guides on [detecting over time windows](detect-over-time-windows.md) and [creating multi-stage detectors](create-multi-stage-detectors.md) show those patterns. Our guide on [adding operators to a package](../packages/add-operators.md) explains how to turn this pattern into a reusable, parameterized user-defined operator with tests.

## See Also

* [Detections](../../explanations/detections.md)
* [`equals`](https://tenzir.com/docs/reference/functions/equals.md)
* [`search`](https://tenzir.com/docs/reference/functions/search.md)
* [`starts_with`](https://tenzir.com/docs/reference/functions/starts_with.md)
* [`ends_with`](https://tenzir.com/docs/reference/functions/ends_with.md)
* [`match_regex`](https://tenzir.com/docs/reference/functions/match_regex.md)
* [`map`](https://tenzir.com/docs/reference/functions/map.md)
* [`any`](https://tenzir.com/docs/reference/functions/any.md)
* [Model detections in OCSF](model-detections-in-ocsf.md)
* [Detect over time windows](detect-over-time-windows.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
* [Map to OCSF](../normalize/map-to-ocsf.md)
* [Add operators](../packages/add-operators.md)
* [Add pipelines](../packages/add-pipelines.md)
* [Write tests](../testing/write-tests.md)
