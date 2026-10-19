---
title: "Normalization"
description: "Why Tenzir maps every source to OCSF first and translates from there"
canonical: https://tenzir.com/docs/explanations/normalization
source: https://tenzir.com/docs/explanations/normalization.md
section: "Docs"
---

# Normalization

> Why Tenzir maps every source to OCSF first and translates from there

Normalization means giving events from different products the same field names and the same meanings. The hard part is not the renaming. It is deciding which set of names to normalize to.

## Everybody has a schema

Security data has no single standard, and not for lack of trying. Every analytics platform defines the shape it wants to read:

| Schema                                                                  | Defined by                                                                                          | Read by                                                             | Agent skill                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [OCSF](https://schema.ocsf.io)                                          | The OCSF project, an open effort with contributors from AWS, Splunk, Cisco, CrowdStrike, and others | Amazon Security Lake, Splunk, Snowflake, and a growing set of tools | [`tenzir-ocsf`](https://tenzir.com/docs/guides/ai-workbench/use-agent-skills.md#use-the-ocsf-skill) |
| [ASIM](https://learn.microsoft.com/en-us/azure/sentinel/normalization)  | Microsoft                                                                                           | Microsoft Sentinel                                                  | [`tenzir-asim`](https://tenzir.com/docs/guides/ai-workbench/use-agent-skills.md#use-the-asim-skill) |
| [CIM](https://docs.splunk.com/Documentation/CIM)                        | Splunk                                                                                              | Splunk Enterprise Security                                          | [`tenzir-cim`](https://tenzir.com/docs/guides/ai-workbench/use-agent-skills.md#use-the-cim-skill)   |
| [ECS](https://www.elastic.co/guide/en/ecs/current/index.html)           | Elastic, now converging with OpenTelemetry semantic conventions                                     | Elastic Security and Observability                                  | [`tenzir-ecs`](https://tenzir.com/docs/guides/ai-workbench/use-agent-skills.md#use-the-ecs-skill)   |
| [UDM](https://cloud.google.com/chronicle/docs/reference/udm-field-list) | Google                                                                                              | Google SecOps                                                       | [`tenzir-udm`](https://tenzir.com/docs/guides/ai-workbench/use-agent-skills.md#use-the-udm-skill)   |
| [EDM](https://docs.fortinet.com/product/fortisiem)                      | Fortinet                                                                                            | FortiSIEM                                                           | [`tenzir-edm`](https://tenzir.com/docs/guides/ai-workbench/use-agent-skills.md#use-the-edm-skill)   |

Alongside them sit the wire formats that carry their own field conventions: ArcSight [CEF](../guides/ai-workbench/use-agent-skills.md#use-the-cef-skill) and QRadar [LEEF](../guides/ai-workbench/use-agent-skills.md#use-the-leef-skill). And every source product emits its own shape on top of all that, which changes between versions.

Each schema in the table has an agent skill that carries its field reference, so an agent can answer mapping questions against the real schema instead of guessing.

The naive answer is to pick your platform’s schema and map everything into it. That works until the day you add a second platform, ship data to a partner, or migrate. Then you discover the real cost: mappings are per pair. Twenty sources and three destinations is sixty mappings to write, test, and maintain, and each new source adds three more.

## OCSF as the intermediate schema

We normalize every source to OCSF first, then translate OCSF into whatever a destination wants. Twenty sources and three destinations becomes twenty mappings plus three, not sixty, and a new source costs exactly one mapping regardless of how many places its events end up.

Every schema translates to every other one through OCSF in the middle, instead of pair by pair

The same reasoning runs in reverse. Data that arrives already mapped to one platform’s schema becomes OCSF once, and from there reaches every other target, which is what makes migrations tractable.

That only works if the intermediate schema can hold everything the sources say. An intermediate that quietly drops fields would poison every destination downstream of it. OCSF qualifies for three reasons:

* **It is vendor-neutral.** No single vendor decides what belongs in it, so modeling your data in OCSF does not encode a bet on one platform.
* **It is semantically rich.** Events are classified by category and class, profiles add cross-cutting attribute sets, and objects model entities such as actors, endpoints, and devices with real structure rather than flat prefixed strings.
* **It is extensible.** Extensions add classes and attributes without forking the schema, and every event carries the source residue and the original payload alongside the mapped fields. Nothing has to be thrown away to make an event conform.

The last point is what makes OCSF viable as an intermediate rather than merely a good destination. A translation to a narrower target schema can then take what it needs and leave the rest, and the detail it cannot express is still there for the next consumer.

## The extra hop is nearly free

Mapping twice sounds like paying twice. In practice the second mapping is close to free, because Tenzir represents events as columnar batches and applies transformations to whole columns at a time. Renaming, moving, and casting fields does not touch a per-event code path, and the pipeline’s cost is dominated by reading and writing bytes at its edges.

So the trade is a small, predictable amount of compute against a mapping count that grows by addition instead of multiplication. For a platform that onboards sources continuously, that trade is not close.

## When to map directly

Skip the intermediate schema when you have exactly one destination, no intention of adding another, and a source whose fields map cleanly into it. A single mapping is simpler than two, and this guidance is about the second destination, not the first.

Also expect asymmetry between targets. OCSF is more expressive than most schemas we translate into, so a translation is usually a narrowing, and what a target cannot represent stays in the event’s residue rather than in the target’s fields.

## Where to go next

Our guides on [normalizing data](../guides/normalize.md) cover each target schema and the decisions it forces, starting with [mapping to OCSF](../guides/normalize/map-to-ocsf.md). Normalization is also the fourth stage of the data lifecycle, after shaping, and [Learn the data lifecycle](../tutorials/learn-the-data-lifecycle.md) shows what sits around it.

## See also

* [Map to OCSF](../guides/normalize/map-to-ocsf.md)
* [Enrichment](enrichment.md)
* [Detections](detections.md)
