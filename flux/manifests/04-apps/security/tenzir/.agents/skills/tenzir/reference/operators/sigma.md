---
title: "sigma"
canonical: https://tenzir.com/docs/reference/operators/sigma
source: https://tenzir.com/docs/reference/operators/sigma.md
section: "Docs"
---

# sigma

> Evaluate Sigma detection rules against structured events.

Evaluate Sigma detection rules against structured events.

```tql
sigma path=string|list<string>, [refresh_interval=duration, format="ocsf"|"plain",
                                 mapping="auto"|"direct"]


sigma rules=string|list<string>, [format="ocsf"|"plain", mapping="auto"|"direct"]
```

## Description

The `sigma` operator evaluates [Sigma](https://sigmahq.io/) detection rules against each input event. By default, every match produces an OCSF Detection Finding with the Security Control profile. Set `format="plain"` to emit a lightweight `tenzir.sigma` record with the original event and the applied rule. Events that match no rule produce no output.

Specify exactly one source with `path=` or `rules=`.

The operator implements Sigma v2.1 detection rules and global filters for the default `sigma` taxonomy. Correlation rules are not supported.

See [Execute Sigma rules](../../guides/detect/execute-sigma-rules.md) for a problem-oriented walkthrough of rule sources, matching modes, and finding consumption.

### `path = string | list<string>`

A rule file, a directory, or a non-empty list of files and directories. Exactly one of `path` and `rules` must be provided. Directories are searched recursively in deterministic order and include files ending in `.yaml` or `.yml`. An explicitly named file can use another extension. Overlapping path entries are deduplicated, and a file can contain multiple YAML documents.

The operator refreshes filesystem-backed rules. A successfully reloaded rule replaces its previous version. If a changed document no longer parses or validates, the operator reports the error and retains its last valid version. Failures in one source do not disable valid rules from other sources. Removing a file from a successfully inspected directory removes its rules.

### `rules = string | list<string>`

One constant string or a non-empty list of constant strings containing Sigma YAML. Each string can contain one document or a multi-document collection. Constant `let` bindings and multiline raw strings are supported. Exactly one of `path` and `rules` must be provided.

Inline rules are parsed when Tenzir constructs the pipeline. They perform no runtime filesystem access and cannot be combined with `refresh_interval`.

### `refresh_interval = duration (optional)`

How often a filesystem-backed source is checked for changes. Requires `path`.

Defaults to `5s`.

### `format = "ocsf" | "plain" (optional)`

The output format:

* `"ocsf"` emits an `ocsf.detection_finding` event with the applied rule, source event, and causal match provenance.
* `"plain"` emits a `tenzir.sigma` event with the source event in `event` and the applied, filter-adjusted rule in `rule`.

Defaults to `"ocsf"`.

### `mapping = "auto" | "direct" (optional)`

How rule fields apply to input events:

* `"auto"` recognizes OCSF-shaped table schemas and applies semantic projections for supported Sigma fields. Other schemas keep direct field matching.
* `"direct"` matches every Sigma field literally and does not use `logsource` to classify input.

Defaults to `"auto"`.

## OCSF matching

With `mapping="auto"`, the operator selects matching behavior once per input schema. A schema is OCSF-shaped when `metadata.version` has type `string` and `class_uid` has type `int64` or `uint64`; other schemas keep direct matching.

For recognized OCSF events, the operator interprets supported Sigma fields by their source meaning: it translates the rule predicate as if the source event had passed through a source-to-OCSF mapping, without transforming the event. An OCSF-native path that no projection claims resolves literally, so rules can mix supported stock fields and explicit OCSF paths.

The `logsource` guard rejects known class, activity, and operating-system contradictions. A translated rule is a statement about its OCSF event class, not about one producer: a Zeek DNS rule matches conformant DNS Activity from any source. Producer constraints apply only when a rule uses a provenance-scoped field whose value lives in a source-specific namespace, such as Sysmon event IDs in `metadata.event_code`. Missing, null, or unknown classifiers keep an event eligible. A rule field that has no projection and does not exist in the schema makes the complete rule unsafe for that schema: the operator skips it and warns once per active rule revision instead of evaluating a weakened condition.

Check rule compatibility

Explore the [Sigma-to-OCSF catalog](../../guides/detect/check-sigma-rule-compatibility-with-ocsf.md#mapping-catalog) for supported logsources and their OCSF classes.

## Field resolution

For a field name that contains dots, the operator first looks for the complete name as an exact top-level key. If that key is absent, it interprets the dots as nested field traversal. For example, `process.name` selects a top-level `"process.name"` field when present and otherwise selects `name` below the `process` record.

Keyword selections recursively inspect every string-valued leaf, including strings inside nested records and lists. They do not serialize records or coerce non-string values. Named field lookup follows record fields only.

A detection item over a field that the event does not carry never matches. This keeps conditions two-valued: in `selection and not filter`, a filter whose field is absent evaluates to false, so the negation holds and the rule can still match.

## Conditions

A list-valued `condition` is treated as a list of OR-linked queries. Conditions support `and`, `or`, `not`, parentheses, `1 of`, `all of`, `them`, and wildcard search-identifier patterns. Numeric quantifiers greater than `1` and the non-standard `any of` spelling are rejected.

Sigma v3

A document whose `sigma-version` resolves to a major other than `2` is rejected instead of being interpreted with different semantics. Provisional Sigma v3 selectors such as `[any]`, `[all]`, `[none]`, and positional array indices are therefore not supported.

## Modifiers

The operator validates every modifier chain before it executes a rule. Unknown, unsupported, incorrectly ordered, or type-incompatible modifiers reject the affected rule with an actionable diagnostic. Nothing is silently ignored.

| Modifiers                                        | Behavior                                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `contains`, `startswith`, `endswith`             | Match a substring, prefix, or suffix.                                                                                                 |
| `cased`                                          | Make a normally case-insensitive string comparison case-sensitive.                                                                    |
| `windash`                                        | Treat a word-initial Windows `-` and `/` as interchangeable.                                                                          |
| `re` with `i`, `m`, `s`                          | Match a regular expression with optional ignore-case, multiline, and dot-all flags. The flags are sub-modifiers and must follow `re`. |
| `base64`, `base64offset`                         | Match Base64 encodings of a value.                                                                                                    |
| `utf16le`/`wide`, `utf16be`, `utf16`             | Encode a string as UTF-16. These must be followed by `base64` or `base64offset`.                                                      |
| `cidr`                                           | Match an IP address against a subnet.                                                                                                 |
| `lt`, `lte`, `gt`, `gte`, `neq`                  | Compare values.                                                                                                                       |
| `exists`                                         | Test whether a field exists. It takes one boolean and cannot be combined with another modifier.                                       |
| `fieldref`                                       | Compare against another event field. It can only be combined with `neq`.                                                              |
| `minute`, `hour`, `day`, `week`, `month`, `year` | Extract a time part before comparison.                                                                                                |
| `all`                                            | Require every value in a list instead of any value.                                                                                   |

In automatic mode, `exists` tests whether the projected source path and its enclosing object are represented. A present null value therefore exists even though ordinary comparisons against it do not match. `fieldref` resolves both field operands independently, so a supported projection can be compared with another projection or with a literal schema field.

The `expand` modifier requires a placeholder mapping, which this operator does not provide. A rule that uses `expand` is rejected. Replace placeholders with concrete values before loading the rule.

## Global filters

The operator supports Sigma v2.1 global filter documents. A filter can target detection rules by unique `id` or `name`, or use `rules: any` for every compatible rule. Its condition is added conjunctively to each target rule.

Filter compatibility uses subset matching over `logsource.category`, `logsource.product`, and `logsource.service`: every value declared by the filter must equal the corresponding target-rule value. A target rule may be more specific. The `definition` key does not participate in this check.

An unknown or ambiguous target, an incompatible log source, or an invalid new filter produces a warning. The target detection continues without that newly invalid filter unless a last valid version of the filter is available.

## OCSF output

The default output is an OCSF 1.9.0 Detection Finding. The mapping separates the analytic, applied policy, source evidence, and match explanation so generic OCSF consumers can process the result without a Sigma-specific event class.

Every finding includes these fixed fields:

* `class_uid: 2004`, `category_uid: 2`, `activity_id: 1`, and `type_uid: 200401`.
* `status_id: 1`, `action_id: 3`, and `disposition_id: 15`.
* `metadata.version: "1.9.0"`, the Tenzir product identity, and the `security_control` profile.
* Sigma `level` mapped to `severity_id`: missing to `0`, `informational` to `1`, `low` to `2`, `medium` to `3`, `high` to `4`, and `critical` to `5`.

The operator does not infer `is_alert`. Set alertability downstream according to your operational policy.

Rule and match details use standard OCSF fields:

* `finding_info.analytic` holds the normalized rule identity. It uses the Sigma `id`, or a deterministic content fingerprint when the rule has no ID.
* `policy.data` holds the complete applied rule, including global-filter adjustments. `policy.is_applied` is `true`.
* `evidences[0].data` holds the original input event.
* `finding_info.traits` lists the causal search identifiers in rule order.
* `observables` contain positive matched field values and point at the projected source path that supplied each value.
* `evidences[1].sigma` records the condition trace, declared and resolved fields, matcher, case mode, polarity, and matched values. Negative and absence decisions remain in the trace but do not create observables.
* Sigma ATT\&CK tags populate `finding_info.attacks` and the Security Control profile’s top-level `attacks` field.
* The rule’s abstract `logsource` populates `finding_info.data_sources`.

Set `format="plain"` when you only need the native `{event, rule}` shape. You can also project that shape from the default finding:

```tql
this = {
  event: evidences[0].data,
  rule: policy.data,
}
```

## Metrics

For every non-empty input batch, the operator emits a `tenzir.metrics.sigma` event with these fields:

* `events`: The number of input events processed.
* `rule_evaluations`: The number of input events multiplied by the number of rules that can be evaluated for the input schema. Rules skipped because a field cannot be resolved are not counted.
* `matches`: The number of rule matches. One event can match multiple rules.

Inspect these events with the `metrics` operator:

```tql
metrics "sigma", live=true
```

## Examples

The examples use inline content for self-contained pipelines and `path=` for managed rule repositories.

### Run an inline rule

```tql
from {user: "alice", action: "login"}
sigma rules=r#"
title: Alice login
id: 4ad8b047-62b0-4d4d-a7ad-6f3fc8c56c6f
logsource:
  category: authentication
detection:
  selection:
    user: alice
    action: login
  condition: selection
level: medium
"#
select title=finding_info.title,
       severity_id,
       event=evidences[0].data,
       identifiers=finding_info.traits
```

### Run and refresh a rule set

```tql
from_file "eve.json", watch=10s {
  read_suricata
}
sigma path=["/etc/tenzir/sigma/network", "/etc/tenzir/sigma/local.yml"],
      refresh_interval=30s
```

### Apply a Sigma rule to Windows Event Log XML

Use [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md) to parse native Windows Event Log XML before applying rules whose fields match that parsed schema:

```tql
from_file "windows-security.xml" {
  read_delimited "</Event>\n", include_separator=true
}
this = data.parse_winlog()
sigma path="rules/windows.yml"
```

## See Also

* [`where`](https://tenzir.com/docs/reference/operators/where.md)
* [`window`](https://tenzir.com/docs/reference/operators/window.md)
* [`summarize`](https://tenzir.com/docs/reference/operators/summarize.md)
* [`parse_winlog`](https://tenzir.com/docs/reference/functions/parse_winlog.md)
* [Execute Sigma rules](../../guides/detect/execute-sigma-rules.md)
* [Model detections in OCSF](../../guides/detect/model-detections-in-ocsf.md)
* [Expressions](../expressions.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
