---
title: "Sigma integration"
description: "Run stock Sigma detection rules on streaming events, natively on OCSF."
canonical: https://tenzir.com/integrations/sigma
source: https://tenzir.com/integrations/sigma.md
section: "Integrations"
---

# Sigma integration

> Run stock Sigma detection rules on streaming events, natively on OCSF.

[Sigma](https://sigmahq.io) is the open standard for vendor-agnostic detection rules. The community-maintained [SigmaHQ repository](https://github.com/SigmaHQ/sigma) alone ships thousands of rules covering process creation, registry tampering, DNS abuse, and many other attack behaviors.

Tenzir executes Sigma rules directly in the pipeline with the [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md) operator. Rules run on streaming events before or alongside SIEM ingestion, and every match produces an OCSF Detection Finding that any downstream tool can consume.

## Run stock rules on OCSF

Sigma rules name source-native fields such as `Image` or `CommandLine`, which normalization usually destroys. Tenzir translates the rule instead of your data: for OCSF events, the operator rewrites each rule predicate to the OCSF paths that carry the same meaning, guided by the rule’s `logsource`. Stock rules from the community repository match normalized events without per-rule field mapping for the logsource families in the mapping catalog.

```tql
subscribe "ocsf"
sigma path="/opt/sigma/rules"
publish "findings"
```

A rule is skipped with a warning if one of its fields has neither a supported projection nor a literal lookup in the input schema. A supported projection with no value in an event does not match that condition. Inspect supported families, field projections, and event guards in our [Sigma mapping catalog](../guides/detect/check-sigma-rule-compatibility-with-ocsf.md#mapping-catalog).

## Load rules from files or inline

Point the operator at a rule repository checkout and it picks up changes on its own, or embed rules directly in the pipeline definition:

```tql
subscribe "windows"
sigma rules=r#"
title: Suspicious Command Shell From Services
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    ParentImage|endswith: '\services.exe'
    Image|endswith: '\cmd.exe'
  condition: selection
"#
```

## Learn more

* [`sigma`](https://tenzir.com/docs/reference/operators/sigma.md) documents the operator, its arguments, and the OCSF mapping catalog.
* [Execute Sigma rules](../guides/detect/execute-sigma-rules.md) walks through rule sources, matching modes, and finding consumption.
* [Detections](../explanations/detections.md) explains Tenzir’s detection model.
