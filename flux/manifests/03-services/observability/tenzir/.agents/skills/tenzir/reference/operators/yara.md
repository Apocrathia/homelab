---
title: "yara"
canonical: https://tenzir.com/docs/reference/operators/yara
source: https://tenzir.com/docs/reference/operators/yara.md
section: "Docs"
---

# yara

> Executes YARA-X rules on a finite byte stream.

Executes YARA-X rules on a finite byte stream.

```tql
yara path=string|list<string>, [include_dirs=string|list<string>, fast_scan=bool, timeout=duration, max_input_size=int, max_matches_per_pattern=int, format="ocsf"|"plain"]


yara rules=string|list<string>, [include_dirs=string|list<string>, fast_scan=bool, timeout=duration, max_input_size=int, max_matches_per_pattern=int, format="ocsf"|"plain"]
```

## Description

The `yara` operator applies [YARA-X](https://virustotal.github.io/yara-x/) rules to bytes. By default, it emits one OCSF [Detection Finding](https://schema.ocsf.io/classes/detection_finding) with the Security Control profile for every matching rule. Set `format="plain"` to emit the original input and native YARA rule metadata instead. Nonmatching rules produce no output.

Specify exactly one rule source with `path=` or `rules=`. The operator compiles rules before it accepts input. It does not accept precompiled rules.

The operator buffers its entire logical input and scans when the input ends. Matches can therefore span chunk boundaries, but the input must be finite. The `max_input_size` option bounds the buffered data.

Tenzir enables the same YARA-X module set in every supported build:

* `console`
* `crx`
* `dex`
* `dotnet`
* `elf`
* `hash`
* `lnk`
* `macho`
* `math`
* `pe`
* `string`
* `time`
* `zip`

The `vt` and `cuckoo` modules are unsupported because Tenzir does not provide their runtime data. The optional `magic` module is not enabled, and experimental and test modules are excluded. Importing a banned module produces a compiler diagnostic.

Rule paths and includes can read local files, so treat them as trusted node configuration. Filesystem-backed rules compile when the operator starts and do not hot-reload. Restart or replace the pipeline after changing them.

### `path = string | list<string>`

A rule file, rule directory, or list of files and directories. Exactly one of `path` and `rules` must be provided. Directories are traversed recursively, and every file ending in `.yar` or `.yara` is compiled as a root source. Give include-only dependencies another extension, such as `.inc`, or pass the root files explicitly. Discovery is deterministic, overlapping paths are deduplicated, and symbolic links are rejected.

### `rules = string | list<string>`

One inline YARA rule source or a list of sources. Exactly one of `path` and `rules` must be provided.

### `include_dirs = string | list<string> (optional)`

Additional directories used to resolve `include` directives. For rules loaded with `path=`, the parent directory of every root rule file is also searched. YARA-X uses one ordered include search path for the complete ruleset, not a separate path for each root. Use unique include paths when roots come from multiple directories.

### `fast_scan = bool (optional)`

Stop collecting matches for each pattern after the first match. The finding’s `evidences[0].data.matches_complete` field is `false` because the evidence is incomplete.

Defaults to `false`.

### `timeout = duration (optional)`

The maximum duration of one scan, with whole-second precision.

Defaults to `1min`. A timeout must be positive and use whole-second precision. The limit is best-effort because YARA-X may not stop immediately in every condition-evaluation path. A timeout produces an error and no partial output.

### `max_input_size = int (optional)`

The maximum number of input bytes that the operator buffers. The operator rejects a larger input before scanning it.

Defaults to `1Gi`. Exceeding the limit produces an error and no partial output. Because the operator snapshots buffered input, a snapshot can approach this limit.

### `max_matches_per_pattern = int (optional)`

The maximum number of matches emitted as evidence for each pattern. This limit does not affect rule evaluation. Reaching it sets `evidences[0].data.matches_complete` to `false` and emits a warning. Independently, the operator stores at most `10000` match records and `16MiB` of Base64-encoded match data across the entire scan. After the data budget is reached, further match records retain their pattern, offset, and length but omit their `data` field.

Defaults to `1000`. Values must be less than `1000000`, the internal YARA-X match storage limit, so the operator can reliably detect incomplete evidence.

### `format = "ocsf" | "plain" (optional)`

The output format:

* `"ocsf"` emits an `ocsf.detection_finding` event with the applied rule and match evidence.
* `"plain"` emits a `tenzir.yara` event containing the original input in `input` and the matched rule descriptor in `rule`.

Defaults to `"ocsf"`.

## Examples

### Scan a file

Scan a file with every `.yar` and `.yara` rule below a directory:

```tql
from_file "suspicious.exe", mmap=true {
  yara path="/etc/tenzir/yara"
}
```

Using `mmap=true` avoids an extra copy when the local file can be memory mapped. The operator still works with chunked input because it buffers the complete byte stream.

Finite inputs only

`yara` waits for the end of input before it emits findings. Do not use it on a never-ending byte stream.

### Use an inline rule

```tql
from_file "suspicious.exe", mmap=true {
  yara rules=r#"
rule SuspiciousDropper {
  meta:
    description = "Detects a demo dropper marker"
  strings:
    $marker = "DROPPER-STAGE-2"
  condition:
    $marker
}
"#
}
```

With the default `format="ocsf"`, a match produces an `ocsf.detection_finding` event. The finding records the rule in `policy`, its `yara:<namespace>:<identifier>` identity in `finding_info.analytic`, and the input digest and ordered matches in `evidences`:

```tql
{
  class_uid: 2004,
  category_uid: 2,
  activity_id: 1,
  type_uid: 200401,
  metadata: {
    version: "1.9.0",
    profiles: ["security_control"],
    product: {name: "Tenzir", vendor_name: "Tenzir"},
  },
  finding_info: {
    title: "YARA match: SuspiciousDropper",
    desc: "Detects a demo dropper marker",
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
  },
  evidences: [{
    name: "Scanned byte stream",
    data: {
      input: {size: 15, sha256: "…"},
      matches_complete: true,
      matches: [{
        pattern: "$marker",
        offset: 0,
        length: 15,
        data: {encoding: "base64", value: "RFJPUFBFUi1TVEFHRS0y"},
      }],
    },
  }],
}
```

### Emit the native YARA representation

Use `format="plain"` when you need the original bytes and rule metadata without an OCSF envelope:

```tql
from_file "suspicious.exe", mmap=true {
  yara path="/etc/tenzir/yara", format="plain"
}
```

The operator emits one `tenzir.yara` event for every matched rule:

```tql
{
  input: b"DROPPER-STAGE-2",
  rule: {
    identifier: "SuspiciousDropper",
    namespace: "default",
    tags: [],
    meta: {description: "Detects a demo dropper marker"},
    patterns: ["$marker"],
  },
}
```

## See Also

* [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md)
* [Scan bytes with YARA](../../guides/detect/scan-bytes-with-yara.md)
