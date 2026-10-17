---
title: "Map to ECS"
canonical: https://tenzir.com/docs/guides/normalize/map-to-ecs
source: https://tenzir.com/docs/guides/normalize/map-to-ecs.md
section: "Docs"
---

# Map to ECS

> This guide shows you how to map events to Elastic Common Schema (ECS) in TQL. You’ll learn how to populate required ECS fields, choose event categorization values, map common network fieldsets, preserve source-specific details, and prepare records for Elasticsearch-compatible destinations.

This guide shows you how to map events to Elastic Common Schema (ECS) in TQL. You’ll learn how to populate required ECS fields, choose event categorization values, map common network fieldsets, preserve source-specific details, and prepare records for Elasticsearch-compatible destinations.

The TQL examples in this guide use nested records that serialize to ECS field paths. For example, `source.ip` in ECS becomes `source: {ip: ...}` in TQL.

## Use the ECS skill

Install the `tenzir-ecs` skill when you want an agent to help with ECS schema decisions. See [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-ecs-skill) for installation and usage examples.

Ask the agent to choose `event.kind`, `event.category`, and `event.type` values before it maps fieldsets. ECS treats `event.category` and `event.type` as lists, and values such as `allowed` or `denied` belong in `event.type` or `event.action`, not automatically in `event.outcome`.

## Choose ECS categorization

Start by setting the fields that define the document contract and search behavior:

* `@timestamp`: The time when the event originated.
* `ecs.version`: The ECS version used for the mapping.
* `event.kind`: The high-level kind, such as `event`, `alert`, `metric`, or `pipeline_error`.
* `event.category`: The broad category list, such as `network`.
* `event.type`: The subtype list, such as `connection`, `allowed`, or `denied`.

For a firewall connection event, choose `event.kind: event`, `event.category: [network]`, and an `event.type` list that includes `connection` plus the normalized disposition when the source records one.

## Apply ECS rules

Mappings live in packages as operators. Our tutorial on [onboarding a data source](../../tutorials/onboard-a-data-source.md) builds one from a log line to an installable package, and the same workflow applies here because only the target fields differ.

These rules are specific to ECS:

* **Populate required fields first**: Set `@timestamp` and `ecs.version` before you map event-specific fieldsets.
* **Choose categorization before fields**: Let `event.kind`, `event.category`, and `event.type` drive which fieldsets you populate.
* **Use role-specific fieldsets**: Use `source` and `destination` for packet or flow direction, and use `client` and `server` when the protocol role matters.
* **Normalize categorical values explicitly**: Map source strings to ECS categorization values such as `network`, `connection`, `allowed`, or `denied`.
* **Preserve custom data deliberately**: Put source-specific details that don’t have an ECS target into a custom namespace, not into a field that ECS already defines for another purpose.

## Send ECS to Elastic-compatible destinations

After you map events to ECS, send them to Elasticsearch or OpenSearch with the Bulk API operators:

```tql
elastic::ecs::map ocsf, ecs
this = move ecs
to_elasticsearch "https://elasticsearch.example.com:9200",
  action="index",
  index="ecs-events"
```

The mapper reads one field and writes another, so a pipeline holding an OCSF event at the top level stages it first, then promotes the ECS document before indexing:

```tql
this = {ocsf: this}
elastic::ecs::map ocsf, ecs
this = move ecs
to_elasticsearch "https://elasticsearch.example.com:9200",
  action="index",
  index="ecs-events"
```

Use [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md) instead when the destination is OpenSearch.

## See Also

* [`to_elasticsearch`](https://tenzir.com/docs/reference/operators/to_elasticsearch.md)
* [`to_opensearch`](https://tenzir.com/docs/reference/operators/to_opensearch.md)
* [Clean up values](../parse/clean-up-values.md)
* [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-ecs-skill)
* [Map to ASIM](map-to-asim.md)
* [Map to CIM](map-to-cim.md)
* [Map to OCSF](map-to-ocsf.md)
* [Map to UDM](map-to-udm.md)
* [Create a package](../packages/create-a-package.md)
* [Write tests](../testing/write-tests.md)
* [Elasticsearch](../../integrations/elasticsearch.md)
* [OpenSearch](../../integrations/opensearch.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
