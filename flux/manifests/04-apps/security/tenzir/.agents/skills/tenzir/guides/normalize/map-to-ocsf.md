---
title: "Map to OCSF"
canonical: https://tenzir.com/docs/guides/normalize/map-to-ocsf
source: https://tenzir.com/docs/guides/normalize/map-to-ocsf.md
section: "Docs"
---

# Map to OCSF

> This guide covers the decisions behind an OCSF mapping: choosing the event class, keeping the mapping minimal, handling unmapped fields, and finalizing the output with Tenzir’s native OCSF operators.

This guide covers the decisions behind an OCSF mapping: choosing the event class, keeping the mapping minimal, handling unmapped fields, and finalizing the output with Tenzir’s native OCSF operators.

Want the full walkthrough?

[Onboard a data source](../../tutorials/onboard-a-data-source.md) takes one log line from a pipeline to an installable package, with this mapping as its third step. This guide covers the mapping decisions in more depth.

## Use the OCSF skill

Install the `tenzir-ocsf` skill when you want an agent to help with OCSF schema decisions. See [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-ocsf-skill) for installation and usage examples.

Ask the agent to choose the OCSF version, event class, and profiles before it maps attributes. OCSF mappings should produce the required classification and occurrence attributes first, then add primary, context, and profile-specific attributes.

## Write the OCSF mapping

Mappings live in packages as operators. The tutorial linked above walks through one from a structured source event to a tested operator, and our guide on [adding operators](../packages/add-operators.md) covers arguments and operator hierarchies. The rest of this guide covers the decisions that are specific to OCSF.

### Key principles

* **Keep unmapped residue**: Source fields without an OCSF target still need review or an intentional decision to preserve source-specific data.
* **Produce minimal OCSF**: Map required identifiers, required attributes, and source-specific semantics. Don’t hand-write derived sibling fields such as `activity_name`, `category_name`, or `severity`; let [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) expand the minimal event before validation.
* **Finalize the result**: After the mapper returns the OCSF event, set `type_uid` and use Tenzir’s native OCSF operators to derive enum siblings and validate the event against its schema.

Think in graphs

OCSF mapping is a bipartite graph transformation: source fields form one vertex set, OCSF attributes form another, and your mapping defines the edges. Edges can be 1:1 (direct assignment), 1:n (field splitting), n:1 (aggregation), or n:m (complex transformation). Fields with no outgoing edges remain in the source scope and become `unmapped` when the mapper returns the OCSF event.

### Package layout

Put the target schema first in mapping namespaces, and let the vendor that owns a schema host the mappers into it. Source-to-OCSF packages use `paloalto::ngfw::ocsf::map`, while the mappers out of OCSF live with their target: `splunk::cim::ocsf::map` for Splunk CIM and `microsoft::asim::ocsf::map` for Microsoft Sentinel ASIM.

A product with several event types needs a dispatcher that routes each recognized event type to an operator under `ocsf/events/` and falls back to the OCSF Base Event. Our tutorial on [creating the mapper](../../tutorials/onboard-a-data-source.md#create-the-mapper) shows that hierarchy together with the normalizer that wraps it, and our guide on [testing packages](../packages/test-packages.md) covers the tests and baselines that go with it.

How much of that hierarchy a package needs depends on its source. The [`amazon` package](https://tenzir.com/packages/amazon/operators/vpc_flow/ocsf/map.tql) owns the parsing and ships a normalizer, because VPC Flow Logs have no built-in reader. A source that Tenzir reads natively, such as Zeek through [`read_zeek_tsv`](https://tenzir.com/docs/reference/operators/read_zeek_tsv.md) or [`read_zeek_json`](https://tenzir.com/docs/reference/operators/read_zeek_json.md), needs neither: its package starts at the mapper and dispatches on the log type.

## Use native OCSF operators

Tenzir ships three operators for completing, validating, and reducing OCSF events:

* [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) derives integer and string enum siblings in either direction and warns about inconsistent pairs.
* [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) casts an event to the OCSF type selected by its version, class, profiles, and extensions. It warns about fields outside that schema and removes them.
* [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md) removes fields according to their OCSF requirement levels when you need to reduce event size.

Use derivation and casting at the boundary after your mapping operator returns, in that order: set `type_uid`, run [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md), then [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md). Set `type_uid` explicitly because [`ocsf_derive`](https://tenzir.com/docs/reference/operators/ocsf_derive.md) does not currently compute it. The operator fills enum siblings such as `activity_name`, `category_name`, and `severity` from their numeric identifiers. It also works in the other direction when a mapping starts with a string sibling.

The [`ocsf_cast`](https://tenzir.com/docs/reference/operators/ocsf_cast.md) operator is the primary schema validation gate. Your mapping is complete when it no longer emits warnings. Use options such as `null_fill=true`, `encode_variants=true`, or `timestamp_to_ms=true` only when a downstream system requires those output shapes or physical representations.

After validation, optionally run [`ocsf_trim`](https://tenzir.com/docs/reference/operators/ocsf_trim.md) to minimize events for storage or transport. Its options let you keep or drop fields that OCSF marks as optional or recommended.

### Finalize events in a field

Each operator has a function counterpart with the same name and options: [`ocsf_derive`](https://tenzir.com/docs/reference/functions/ocsf_derive.md), [`ocsf_cast`](https://tenzir.com/docs/reference/functions/ocsf_cast.md), and [`ocsf_trim`](https://tenzir.com/docs/reference/functions/ocsf_trim.md). The functions take the OCSF event as an argument, so they finalize an event that a mapper wrote into a field without hoisting it to the top level first. The envelope around it, such as `raw_data`, stays where it is:

```tql
vendor::ocsf::map input, ocsf
ocsf = ocsf_cast(ocsf_derive(ocsf))
```

The functions also handle failures differently. Where the operators drop an event whose OCSF version or class they cannot resolve, the functions return `null` with a warning and keep the rest of the event. Assign the result to a new field to route such events into a quarantine instead of losing them:

```tql
validated = ocsf_cast(ocsf)
if validated == null {
  publish "ocsf-quarantine"
} else {
  ocsf = move validated
  publish "ocsf"
}
```

## Look up identifiers and names

Six functions translate between OCSF identifiers and their names, so a mapping never hard-codes a number it can compute:

* [`ocsf_class_uid`](https://tenzir.com/docs/reference/functions/ocsf_class_uid.md) and [`ocsf_class_name`](https://tenzir.com/docs/reference/functions/ocsf_class_name.md) convert between a class name and its `class_uid`, as in `ocsf_class_uid("DNS Activity")` and `ocsf_class_name(4003)`.
* [`ocsf_category_uid`](https://tenzir.com/docs/reference/functions/ocsf_category_uid.md) and [`ocsf_category_name`](https://tenzir.com/docs/reference/functions/ocsf_category_name.md) do the same for categories, as in `ocsf_category_uid("Findings")`.
* [`ocsf_type_uid`](https://tenzir.com/docs/reference/functions/ocsf_type_uid.md) and [`ocsf_type_name`](https://tenzir.com/docs/reference/functions/ocsf_type_name.md) cover the combination of class and activity, as in `ocsf_type_uid("SSH Activity: Fail")` and `ocsf_type_name(400704)`.

Use them where a source carries the name rather than the number, which is common for data that arrives from another OCSF producer:

```tql
class_uid = ocsf_class_uid(vendor_class)
category_uid = ocsf_category_uid(vendor_category)
```

They also make a mapping readable in the other direction. Writing `where class_uid == ocsf_class_uid("Network Activity")` in a detection says what the rule matches, while `where class_uid == 4001` makes the reader look it up.

## See also

* [Model detections in OCSF](../detect/model-detections-in-ocsf.md)
* [Clean up values](../parse/clean-up-values.md)
* [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-ocsf-skill)
* [Map to ASIM](map-to-asim.md)
* [Map to CIM](map-to-cim.md)
* [Map to ECS](map-to-ecs.md)
* [Map to UDM](map-to-udm.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
