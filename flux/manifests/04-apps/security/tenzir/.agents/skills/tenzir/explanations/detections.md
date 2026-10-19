---
title: "Detections"
description: "Understand how Tenzir matches, correlates, and models security evidence as detection results"
canonical: https://tenzir.com/docs/explanations/detections
source: https://tenzir.com/docs/explanations/detections.md
section: "Docs"
---

# Detections

> Understand how Tenzir matches, correlates, and models security evidence as detection results

A **detection** turns security telemetry into a judgment that something may require attention. In Tenzir, a detection is a data pipeline rather than a separate subsystem: it can prepare evidence, match conditions, correlate sightings, model a result, and route that result with the same TQL building blocks used elsewhere.

This model keeps the matching language independent from the result contract. TQL, Sigma, and YARA-X identify different kinds of evidence, and each can feed the same downstream representation. The `sigma` and `yara` operators produce OCSF Detection Findings directly by default.

## Follow the detection flow

A complete detection can include five stages:

| Stage     | Purpose                                                               |
| --------- | --------------------------------------------------------------------- |
| Prepare   | Parse, normalize, and enrich the evidence that the detection reads.   |
| Match     | Identify events or bytes that satisfy a condition.                    |
| Correlate | Combine sightings across entities, time windows, or persistent state. |
| Model     | Turn the result into an alertable source event or an OCSF finding.    |
| Deliver   | Route, store, or forward the result for triage and response.          |

Not every detection needs every stage. A single-event predicate can match and model a finding immediately. A behavioral detector may aggregate many events before it has a result, while a multi-stage detector may consume findings from other detections instead of raw telemetry.

Normalization and enrichment make matching logic easier to reuse. OCSF gives structured detections stable field paths across data sources, while contexts add asset, identity, and threat intelligence that can change the meaning of an otherwise ordinary event. The explanations of [enrichment](enrichment.md) and the guide on [mapping events to OCSF](../guides/normalize/map-to-ocsf.md) cover these preparation steps.

## Choose matching logic

Choose the matching language from the evidence and the detection content you already have:

| Evidence and content                         | Matching language                                       | Best fit                                                                         |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Structured events and native detection logic | [TQL](language.md) | Predicates, transformations, and custom logic over your event schema.            |
| Structured events and portable rule content  | [Sigma](https://sigmahq.io)                             | Existing Sigma rule sets from public, commercial, or internal sources.           |
| Files, payloads, and other byte streams      | [YARA-X](https://virustotal.github.io/yara-x/)          | Rules that inspect raw content and emit findings with byte-level match evidence. |

These languages compose rather than compete. TQL provides the surrounding pipeline even when Sigma or YARA performs the match. The guides on [matching events with TQL](../guides/detect/match-events-with-tql.md), [executing Sigma rules](../guides/detect/execute-sigma-rules.md), and [scanning bytes with YARA](../guides/detect/scan-bytes-with-yara.md) show each matching model.

## Correlate evidence over time

A match can stand on its own or become one input to a broader judgment:

* A **single-event detection** evaluates one event independently.
* A **windowed detection** counts or compares events within bounded event-time intervals. Thresholds and rolling baselines are common examples.
* A **behavioral detection** measures the shape of activity rather than its volume, such as the regularity of a beacon’s check-in cadence.
* A **multi-stage detection** combines independent sightings for the same entity, either in any order or as a sequence.
* A **stateful detection** uses a context when memory must outlive one window or pipeline restart.

Correlation increases context, not automatically confidence. The quality of a combined verdict still depends on the stages, grouping keys, time semantics, and thresholds. The guides on [detecting over time windows](../guides/detect/detect-over-time-windows.md), [detecting periodic behavior](../guides/detect/detect-periodic-behavior.md), and [creating multi-stage detectors](../guides/detect/create-multi-stage-detectors.md) cover these tradeoffs.

## Distinguish matches, findings, alerts, and incidents

Detection terms describe different parts of the flow:

| Concept                                                               | Meaning                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Source event                                                          | The activity or observation that entered the detection.                                                                                    |
| Match or sighting                                                     | Evidence that satisfied matching logic. This is a pipeline result, not an OCSF event class.                                                |
| [Detection Finding](https://schema.ocsf.io/classes/detection_finding) | An OCSF event that represents an analytic result with its own identity, evidence, triage fields, and lifecycle.                            |
| Alert                                                                 | An event marked with `is_alert: true` because it may require immediate attention. Alertability is independent of event class and severity. |
| Incident                                                              | A finding that has entered an incident workflow, not every alert or detection match.                                                       |

When a security control judges an activity as it happens, keep the source activity and apply the OCSF [Security Control profile](https://schema.ocsf.io/profiles/security_control). When analysis produces a separate result, emit an OCSF Detection Finding. A Detection Finding can itself be alertable, but the class does not imply `is_alert: true`.

Stable identities let downstream systems deduplicate findings, track lifecycle updates, and link a combined verdict to its source events. A finding also carries its classification as data: `finding_info.attacks` embeds MITRE ATT\&CK tactic and technique mappings in the event itself rather than in rule metadata, so the mapping survives routing, storage, and correlation. The guide on [modeling detections in OCSF](../guides/detect/model-detections-in-ocsf.md) explains these output choices.

## Choose the alerting posture

Not every detection should page an analyst. Detection catalogs such as Splunk’s [security\_content](https://github.com/splunk/security_content) encode this intent as rule metadata, distinguishing direct alerts, risk-contributing anomalies, hunting queries, and correlations. OCSF expresses the same posture in each finding as data:

| Posture  | Intent                                        | OCSF encoding                                                                           |
| -------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Alert    | The match is actionable on its own.           | Detection Finding with `is_alert: true` and a `severity_id` that reflects the impact.   |
| Evidence | The match matters in aggregate, not alone.    | Detection Finding with `risk_score` and `confidence_id`, without the alert flag.        |
| Hunt     | An analyst explores a hypothesis.             | Pipeline results over stored events, without a finding.                                 |
| Combine  | Several weak signals form one strong verdict. | A new Detection Finding that links its contributing findings and sets `is_alert: true`. |

The posture is independent of the analytic method recorded in `analytic.type_id`: a high-confidence rule can emit evidence rather than an alert, and a statistical detector can alert directly when its precision has earned it. Pairing evidence-posture findings with a risk-accumulating combinator, as the guide on [accumulating risk per entity](../guides/detect/create-multi-stage-detectors.md#accumulate-risk-per-entity) shows, lets low-confidence detections contribute without paging anyone.

## Compose detections for operation

Package matching and result modeling together when they form one reusable detection. Keep source and destination wiring outside that operator so the same detection can run over historical data, a live topic, or a test fixture.

Topics decouple producers from consumers. A stage can publish every finding without knowing which combinators consume it, while each combinator owns its correlation and suppression policy. This keeps stage evidence available for counting, sequencing, and future compositions.

Treat detections as versioned content: give analytics stable identities, test them against representative example data and historical events, and package related operators, pipelines, contexts, and tests together. Our guide on [adding operators to a package](../guides/packages/add-operators.md) explains how to expose reusable detection logic as a user-defined operator. Our [`tenzir` package](https://github.com/tenzir/library/tree/main/tenzir) applies this model and ships streaming network detectors under the `tenzir::detect::network` namespace.

## See also

* [Enrichment](enrichment.md)
* [Packages](packages.md)
* [Match events with TQL](../guides/detect/match-events-with-tql.md)
* [Model detections in OCSF](../guides/detect/model-detections-in-ocsf.md)
* [Detect over time windows](../guides/detect/detect-over-time-windows.md)
* [Baseline behavior from stored events](../guides/detect/baseline-from-stored-events.md)
* [Create multi-stage detectors](../guides/detect/create-multi-stage-detectors.md)
* [Execute Sigma rules](../guides/detect/execute-sigma-rules.md)
* [Scan bytes with YARA](../guides/detect/scan-bytes-with-yara.md)
* [Add operators](../guides/packages/add-operators.md)
