---
title: "Execute Sigma rules"
description: "Run Sigma v2.1 rules on structured events and emit OCSF Detection Findings with causal match evidence"
canonical: https://tenzir.com/docs/guides/detect/execute-sigma-rules
source: https://tenzir.com/docs/guides/detect/execute-sigma-rules.md
section: "Docs"
---

# Execute Sigma rules

> Run Sigma v2.1 rules on structured events and emit OCSF Detection Findings with causal match evidence

This guide shows you how to execute [Sigma](https://sigmahq.io/) detection rules with the [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md) operator. Sigma is a bring-your-own-content integration for structured events: you can run rules from the SigmaHQ corpus, a content vendor, or your own detection team inside a TQL pipeline.

Tenzir evaluates Sigma v2.1 detection rules and global filters. Every match becomes an OCSF Detection Finding by default, so Sigma output can share the same routing, storage, and triage path as findings from YARA-X and native TQL.

To verify a stock rule against normalized events, follow our worked guide on [checking Sigma rule compatibility with OCSF](check-sigma-rule-compatibility-with-ocsf.md). It includes a self-contained pipeline, expected output, and failure diagnostics.

## Choose a rule source

Use `path=` for a managed repository and `rules=` for content embedded in the pipeline. The two forms use the same parser, validation, filter resolution, and matching semantics.

### Load rules from files and directories

A `path=` value can name one file, one directory, or a non-empty list that mixes both:

```tql
subscribe "ocsf.process-activity"
sigma path=[
  "/etc/tenzir/sigma/windows/",
  "/etc/tenzir/sigma/local/encoded-powershell.yml",
], refresh_interval=30s
publish "detections.sigma"
```

Directories are searched recursively in lexical order and include `.yaml` and `.yml` files. An explicitly named rule file can use another extension. Overlapping entries are deduplicated. A file can contain several `---`-separated YAML documents, which lets you keep detection rules and their global filters together.

Filesystem rules refresh without restarting the pipeline. A broken change does not replace a valid active rule: Tenzir keeps that document’s last valid version, reports the new error once, and still updates unrelated rules. Removing a source file from a successfully inspected directory removes its rules.

### Embed one or more rules

A `rules=` value accepts one constant string or a list of constant strings. Each string can itself contain multiple YAML documents:

```tql
let $login_rule = r#"
title: Administrator login
id: 522a07df-a6ac-43db-85d6-f005f86ea777
logsource:
  category: authentication
detection:
  selection:
    user.name: administrator
  condition: selection
level: medium
"#


from {user: {name: "administrator"}}
sigma rules=[$login_rule]
```

Tenzir validates inline rules when it constructs the pipeline and includes the content in the operator plan. Inline rules do not access the filesystem at runtime and cannot use `refresh_interval`.

## Choose automatic or direct matching

The default `mapping="auto"` recognizes an OCSF-shaped table schema when `metadata.version` is a string and `class_uid` is an `int64` or `uint64`. It plans matching once for that schema, uses semantic projections for supported stock fields, and keeps direct matching for other schemas. The values of `metadata.version` and `class_uid` do not control dispatch for individual rows.

Structural recognition deliberately favors predictable columnar execution over per-row dispatch. It also recognizes a non-OCSF schema that happens to contain both typed fields. Use `mapping="direct"` for that input. Direct mode is also the escape hatch for rules that intentionally interpret their fields literally on OCSF data.

### Understand field lookup

For a field name such as `process.name`, Tenzir first checks whether the event has an exact top-level key named `"process.name"`. Only when that key is absent does it traverse the nested path `process.name`. This rule makes collisions deterministic for telemetry that mixes flattened and nested fields.

Keyword selections have no field name. They recursively inspect every string leaf in records and lists and match when any leaf satisfies the keyword. They do not serialize complete events or compare numbers as strings.

An OCSF-native field path that has no stock projection also resolves directly in automatic mode:

```tql
subscribe "ocsf"
sigma rules=r#"
title: OCSF-native process path
detection:
  selection:
    process.path|endswith: '\powershell.exe'
  condition: selection
"#
```

Use `mapping="direct"` as the explicit opt-out when a rule intentionally names custom fields on OCSF events:

```tql
subscribe "custom-ocsf"
sigma path="rules/custom-ocsf.yml", mapping="direct"
```

Direct mode interprets every field literally and never uses `logsource` to filter events. It also preserves the previous matching behavior for pipelines that add source-compatible aliases before `sigma`.

### Use conservative `logsource` guards

A translated rule outgrows its original producer: once its fields resolve to OCSF paths, a Zeek DNS rule is a DNS Activity rule and matches conformant events from any source. Automatic mode therefore uses `logsource` for semantic constraints only: a Windows process-creation rule rejects a known DNS class, a Process Activity Terminate event, or a Linux operating system. Producer identity matters only for provenance-scoped fields whose values live in a source-specific namespace, such as Sysmon event IDs: a rule that matches `EventID` keeps a producer guard so Sysmon event 13 never compares against a Security-log event code. Missing, null, unknown, and unfamiliar optional classifiers stay eligible. This prevents sparse but matchable OCSF events from becoming false negatives.

Semantic projections apply to the logsource families in the [mapping catalog](check-sigma-rule-compatibility-with-ocsf.md#mapping-catalog). Other rules resolve their fields literally against the schema or skip safely when a required field is absent.

The operator preserves `logsource` in the finding and also uses it to decide whether a global filter is compatible with a target rule.

### Fail closed on unsafe translations

Some source fields survive normalization only as vendor residue or disappear entirely. A field without a semantic projection first resolves literally against the OCSF-shaped schema. If it is absent, a Sysmon rule that depends on `CallTrace`, `SourceThreadId`, or `TerminalSessionId` cannot be translated safely without an explicit stable representation. Tenzir skips the complete rule for that schema and warns once per active rule revision. It never removes the condition or substitutes a field that merely looks related.

## Use Sigma v2.1 behavior

The operator implements the Sigma v2.1 detection surface for the default `sigma` taxonomy. This includes list-valued conditions, keyword selections, `1 of` and `all of` search-identifier quantifiers, and validated modifier chains.

### Use supported modifiers

The standard v2.1 modifiers are supported except `expand`, which requires an external placeholder mapping. Important groups include:

* String matching: `contains`, `startswith`, `endswith`, `cased`, and `windash`.
* Regular expressions: `re` followed by the optional sub-modifiers `i`, `m`, and `s`.
* Encodings: `base64`, `base64offset`, `utf16le`/`wide`, `utf16be`, and `utf16`. A UTF-16 modifier must feed a Base64 modifier.
* Comparisons: `lt`, `lte`, `gt`, `gte`, `neq`, `cidr`, and `fieldref`.
* Structure and time: `exists`, `all`, `minute`, `hour`, `day`, `week`, `month`, and `year`.

Modifier order and value types matter. The operator rejects unknown modifiers, invalid chains, unresolved `expand` placeholders, and custom taxonomies with a diagnostic tied to the affected document. It never drops a modifier silently. The complete compatibility table lives in the [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md) reference.

Use `windash` when a rule must recognize both Windows argument prefixes:

```yaml
CommandLine|windash|contains: " -EncodedCommand "
```

For a native TQL translation of the same concept, the equivalent predicate is a case-insensitive regex such as `r"(?i)[/-]encodedcommand"`.

### Apply global filters

A Sigma v2.1 global filter can tune one or more rules without changing their source documents. This inline collection suppresses known administrator accounts from a process rule:

```tql
from {Image: "C:\\Temp\\evil.exe", User: "adm_backup"},
     {Image: "C:\\Temp\\evil.exe", User: "alice"}
sigma rules=r#"
title: Suspicious process
id: 6f3e2987-db24-4c78-a860-b4f4095a7095
logsource:
  category: process_creation
detection:
  selection:
    Image|endswith: '\evil.exe'
  condition: selection
---
title: Ignore administrator accounts
logsource:
  category: process_creation
filter:
  rules:
    - 6f3e2987-db24-4c78-a860-b4f4095a7095
  selection:
    User|startswith: 'adm_'
  condition: not selection
"#
select event=evidences[0].data
```

Only the event that does not match the administrator filter remains:

```tql
{
  event: {
    Image: "C:\\Temp\\evil.exe",
    User: "alice",
  },
}
```

The filter condition is AND-linked with the target detection. Targets resolve by unique `id` or `name`; `rules: any` selects every logsource-compatible rule. Compatibility requires every `category`, `product`, and `service` value in the filter to match the target, while the target may declare additional values.

Sigma v3

An omitted `sigma-version` resolves to major 2. Declaring major 2 explicitly is also accepted. A different major is rejected instead of being interpreted with v2 semantics. Provisional Sigma v3 array selectors such as `[any]`, `[all]`, `[none]`, `[all_or_empty]`, and positional indices are therefore not part of the current operator contract.

Sigma correlation documents are also rejected. Express temporal and aggregate correlations with [`window`](https://tenzir.com/docs/reference/operators/window.md), [`group`](https://tenzir.com/docs/reference/operators/group.md), and [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md), as our guide on [creating multi-stage detectors](create-multi-stage-detectors.md) shows.

## Consume the OCSF finding

The default result separates normalized analytic identity, the applied policy, the original evidence, and causal match details. One input event can match multiple rules; the operator emits one finding per matching rule in deterministic source order.

### Inspect the mapping

Every match has the fixed OCSF Detection Finding classification `class_uid: 2004`, `activity_id: 1`, and `type_uid: 200401`. The Security Control profile adds `action_id: 3` (Observed) and `disposition_id: 15` (Detected). Sigma `level` maps from Unknown through Critical to `severity_id: 0` through `5`.

The operator uses the remaining fields for distinct purposes:

* `finding_info.analytic` identifies the rule by Sigma `id`, or by a stable content fingerprint when the ID is absent.
* `policy.data` preserves the complete applied rule, including global-filter adjustments.
* `evidences[0].data` preserves the original event without normalizing it into another OCSF activity class.
* `finding_info.traits` records the search identifiers that causally established the match.
* `observables` records positive matched values with paths back into the source evidence.
* `evidences[1].sigma` carries the condition trace and field-level matcher, path, case, polarity, and value details that have no dedicated OCSF field.
* ATT\&CK tags populate `finding_info.attacks` and the Security Control profile’s top-level `attacks` field.

This mapping makes the finding interoperable while retaining the information needed to explain the match. It does not set `is_alert`, because a Sigma match has no universal alerting posture. Add that policy downstream.

### Recover the lightweight representation

Use `format="plain"` when a pipeline only needs the matched event and rule:

```tql
sigma path="rules/windows.yml", format="plain"
```

The operator emits this shape without constructing an OCSF finding:

```tql
{
  event: {/* original event */},
  rule: {/* complete applied rule */},
}
```

You can also project the plain shape from the default output when one pipeline branch needs the complete OCSF finding and another needs only the event and rule:

```tql
this = {
  event: evidences[0].data,
  rule: policy.data,
}
```

## See Also

* [Detections](../../explanations/detections.md)
* [Match events with TQL](match-events-with-tql.md)
* [Model detections in OCSF](model-detections-in-ocsf.md)
* [Create multi-stage detectors](create-multi-stage-detectors.md)
* [Add operators](../packages/add-operators.md)
* [Map to OCSF](../normalize/map-to-ocsf.md)
* [Microsoft Windows Event Logs](../../integrations/microsoft/windows-event-logs.md)
