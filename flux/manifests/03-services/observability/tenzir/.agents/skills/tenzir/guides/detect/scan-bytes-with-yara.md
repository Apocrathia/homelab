---
title: "Scan bytes with YARA"
description: "Run YARA-X rules on files and finite byte streams and emit OCSF or native matches"
canonical: https://tenzir.com/docs/guides/detect/scan-bytes-with-yara
source: https://tenzir.com/docs/guides/detect/scan-bytes-with-yara.md
section: "Docs"
---

# Scan bytes with YARA

> Run YARA-X rules on files and finite byte streams and emit OCSF or native matches

This guide shows you how to run [YARA-X](https://virustotal.github.io/yara-x/) rules with the [`yara`](https://tenzir.com/docs/reference/operators/yara.md) operator. YARA covers raw bytes, while Sigma and TQL predicates match structured event fields. By default, each matching YARA rule becomes an OCSF Detection Finding that you can route alongside findings from other detection methods. You can also request a lightweight native result containing the original bytes and matched rule metadata.

## Understand the execution model

The [`yara`](https://tenzir.com/docs/reference/operators/yara.md) operator treats its entire input as one contiguous byte sequence. It buffers everything and scans when the input ends. That has one hard consequence: **the input must be finite**. Scan one file or one carved payload at a time, never an unbounded stream. A timeout, input-size violation, scan failure, or invalid match range produces an error without partial finding output.

Specify exactly one rule source:

* `path=` accepts a rule file, a recursively discovered directory, or a list of files and directories.
* `rules=` accepts one inline source or a list of inline sources.

The operator compiles source rules before processing input. It does not accept precompiled rules. YARA-X resolves `include` directives from one global search path containing `include_dirs=` and the parent directories of root rule files.

Operational limits keep each scan bounded:

* `timeout=1min` limits scanning time with whole-second precision.
* `max_input_size=1Gi` limits the buffered input.
* `max_matches_per_pattern=1000` limits emitted match evidence without changing rule evaluation. Set it below YARA-X’s internal limit of `1000000`. Across the entire scan, the operator stores at most `10000` match records and `16MiB` of Base64-encoded match data.
* `fast_scan=true` keeps only the first match per pattern when complete match evidence is unnecessary.

The last two options make match evidence incomplete. An OCSF finding records this as `evidences[0].data.matches_complete: false`.

Choose an output with `format=`:

* `format="ocsf"` emits OCSF Detection Findings and is the default.
* `format="plain"` emits `tenzir.yara` events with the original bytes and the matched rule descriptor.

## Scan a file

Start with a rule that detects marker strings of a hypothetical malware dropper:

dropper.yara

```yara
rule SuspiciousDropper {
  meta:
    author = "Tenzir"
    description = "Detects marker strings of the demo dropper family"
  strings:
    $marker = "DROPPER-STAGE-2"
    $c2 = "callback.badcdn.example"
  condition:
    $marker or $c2
}
```

Feed a file into the scan with [`from_file`](https://tenzir.com/docs/reference/operators/from_file.md). The `mmap=true` flag maps a local file into memory when possible, avoiding an extra copy:

```tql
from_file "invoice.pdf.exe", mmap=true {
  yara path="dropper.yara"
}
```

A matching rule produces an `ocsf.detection_finding` event. The output includes these fields:

```tql
{
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  type_uid: 200401,
  status_id: 1,
  severity_id: 0,
  metadata: {
    version: "1.9.0",
    product: {name: "Tenzir", vendor_name: "Tenzir"},
    profiles: ["security_control"],
  },
  finding_info: {
    title: "YARA match: SuspiciousDropper",
    desc: "Detects marker strings of the demo dropper family",
    analytic: {
      uid: "yara:default:SuspiciousDropper",
      name: "SuspiciousDropper",
      type_id: 1,
    },
  },
  policy: {
    uid: "yara:default:SuspiciousDropper",
    name: "SuspiciousDropper",
    type: "YARA rule",
    is_applied: true,
    data: {
      identifier: "SuspiciousDropper",
      namespace: "default",
      tags: [],
      meta: {
        author: "Tenzir",
        description: "Detects marker strings of the demo dropper family",
      },
      patterns: ["$c2", "$marker"],
    },
  },
  evidences: [{
    uid: "sha256:…",
    name: "Scanned byte stream",
    data: {
      input: {size: 84, sha256: "…"},
      matches_complete: true,
      matches: [{
        pattern: "$marker",
        offset: 26,
        length: 15,
        data: {encoding: "base64", value: "RFJPUFBFUi1TVEFHRS0y"},
      }],
    },
  }],
}
```

`finding_info.analytic.uid` identifies the rule as `yara:<namespace>:<identifier>`. `finding_info.uid` is a unique UUID for the emitted finding, and `metadata.uid` identifies this particular event creation. The operator does not infer finding identity from the input bytes.

The finding’s `policy.data` preserves the applied rule metadata. The evidence preserves the input SHA-256 digest and ordered matches. Match bytes use Base64 so arbitrary binary data remains representable. After the encoded-data budget is reached, match records retain their pattern, offset, and length but omit their `data` field.

## Emit native YARA matches

Use `format="plain"` when you want the original input and rule metadata without constructing an OCSF finding:

```tql
from_file "invoice.pdf.exe", mmap=true {
  yara path="dropper.yara", format="plain"
}
```

The operator emits one `tenzir.yara` event per matched rule:

```tql
{
  input: b"…",
  rule: {
    identifier: "SuspiciousDropper",
    namespace: "default",
    tags: [],
    meta: {
      author: "Tenzir",
      description: "Detects marker strings of the demo dropper family",
    },
    patterns: ["$c2", "$marker"],
  },
}
```

The `input` field contains the complete byte stream. Use the default OCSF format when you need a digest and bounded, Base64-encoded match evidence instead of carrying the original bytes in every result.

## Load a rule repository

Point `path=` at a directory to discover `.yar` and `.yara` files recursively:

```tql
from_file "invoice.pdf.exe", mmap=true {
  yara path="/etc/tenzir/yara"
}
```

Discovery has deterministic ordering and deduplicates files reachable through overlapping path entries. Symbolic links are rejected. Every discovered `.yar` and `.yara` file is a root source. Give include-only dependencies another extension, such as `.inc`, or pass the root files explicitly instead of scanning their directory.

YARA-X uses one ordered include search path for the complete ruleset rather than a separate path for each root. Use unique include paths when roots come from multiple directories. Add more search locations with `include_dirs=`:

```tql
from_file "invoice.pdf.exe", mmap=true {
  yara path="/etc/tenzir/yara/rules",
       include_dirs=["/etc/tenzir/yara/includes"]
}
```

The supported YARA-X modules are `console`, `crx`, `dex`, `dotnet`, `elf`, `hash`, `lnk`, `macho`, `math`, `pe`, `string`, `time`, and `zip`. This set is identical across supported Linux, macOS, dynamic, and static builds. The `console` module writes to Tenzir’s debug log.

The `vt` and `cuckoo` modules are rejected because their rules require runtime data that Tenzir does not provide. The optional `magic` module is not enabled, and experimental and test modules are excluded. An unsupported import produces a compiler diagnostic instead of changing rule behavior.

Rule paths and includes can read local files, so treat them as trusted node configuration. Filesystem-backed rules compile when the operator starts. They do not hot-reload, so restart or replace the pipeline after changing them.

## Scan files continuously

A watched glob invokes its nested pipeline separately for every file, keeping each scan finite while checking for new files:

```tql
from_file "/srv/quarantine/*.exe", watch=10s, mmap=true {
  yara path="/etc/tenzir/yara"
}
```

Files without a match produce no finding. This shape also works for payloads that another tool carves from network traffic, such as files extracted by Suricata.

The operator’s evidence identifies the bytes, but it does not know the source file’s name or path. Add that context downstream if your pipeline needs it, or link the finding to an OCSF [File System Activity](https://schema.ocsf.io/classes/file_activity) event by its SHA-256 digest.

## Use inline rules

Inline rules are useful for self-contained pipelines and packages:

```tql
from_file "invoice.pdf.exe", mmap=true {
  yara rules=r#"
rule SuspiciousDropper {
  strings:
    $marker = "DROPPER-STAGE-2"
  condition:
    $marker
}
"#, max_input_size=100Mi
  select analytic_uid=finding_info.analytic.uid,
         matches_complete=evidences[0].data.matches_complete,
         matches=evidences[0].data.matches
}
```

The compact result still exposes the rule identity and exact match evidence:

```tql
{
  analytic_uid: "yara:default:SuspiciousDropper",
  matches_complete: true,
  matches: [{
    pattern: "$marker",
    offset: 26,
    length: 15,
    data: {encoding: "base64", value: "RFJPUFBFUi1TVEFHRS0y"},
  }],
}
```

Use `path=` for a managed rule repository and `rules=` when the rule belongs to the pipeline itself.

## See Also

* [Detections](../../explanations/detections.md)
* [Match events with TQL](match-events-with-tql.md)
* [Model detections in OCSF](model-detections-in-ocsf.md)
* [Execute Sigma rules](execute-sigma-rules.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
