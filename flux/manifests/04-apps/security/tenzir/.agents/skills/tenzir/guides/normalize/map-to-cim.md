---
title: "Map to CIM"
canonical: https://tenzir.com/docs/guides/normalize/map-to-cim
source: https://tenzir.com/docs/guides/normalize/map-to-cim.md
section: "Docs"
---

# Map to CIM

> This guide shows you how to map events to Splunk Common Information Model (CIM) fields in TQL. You’ll learn how to choose a CIM data model and dataset, apply dataset tags, populate normalized fields, set Splunk HEC metadata, and preserve source-specific details.

This guide shows you how to map events to Splunk Common Information Model (CIM) fields in TQL. You’ll learn how to choose a CIM data model and dataset, apply dataset tags, populate normalized fields, set Splunk HEC metadata, and preserve source-specific details.

CIM is organized around data models and datasets rather than a single event record hierarchy. For Splunk searches and accelerated data models to find your events, the mapping must produce the right tags and normalized fields for the chosen dataset.

## Use the CIM skill

Install the `tenzir-cim` skill when you want an agent to help with CIM schema decisions. See [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-cim-skill) for installation and usage examples.

Ask the agent to choose the data model and dataset before it maps fields. The skill can inspect tags, constraints, recommended fields, calculated fields, and lookup-backed values for the selected dataset.

## Choose the CIM dataset

Start from the event semantics, then choose the closest CIM data model and dataset. For a firewall connection event, choose the `Network_Traffic` data model and the `All_Traffic` dataset.

For `Network_Traffic / All_Traffic`, start with these fields and tags:

* `tag`: Include `network` and `communicate`.
* `_time`: The event timestamp.
* `src`, `src_ip`, and `src_port`: The source endpoint.
* `dest`, `dest_ip`, and `dest_port`: The destination endpoint.
* `transport`: The layer 4 protocol, such as `tcp`, `udp`, or `icmp`.
* `action`: The normalized traffic action, such as `allowed`, `blocked`, or `teardown`.
* `bytes`, `bytes_in`, and `bytes_out`: Traffic volume fields.
* `dvc` and `vendor_product`: The reporting product context.

## Apply CIM rules

Mappings live in packages as operators. Our tutorial on [onboarding a data source](../../tutorials/onboard-a-data-source.md) builds one from a log line to an installable package, and the same workflow applies here because only the target fields differ.

These rules are specific to CIM:

* **Choose the dataset first**: Let the CIM data model, dataset tags, and constraints drive the mapping.
* **Apply dataset tags**: Include the tags from the selected dataset and its parent chain so Splunk data model searches can find the event.
* **Populate recommended fields**: Map recommended fields such as `src`, `dest`, `action`, `transport`, `dvc`, and `vendor_product` when the source provides them.
* **Use lookup-backed values**: Normalize values such as `action` and `transport` to the values documented by CIM lookups.
* **Preserve unmapped fields**: Keep source fields that don’t have a deliberate CIM target in `unmapped` so reviewers can audit the mapping.

## Send CIM events to Splunk

When you send CIM-shaped events to Splunk HEC, pass Splunk metadata through the dedicated [`to_splunk`](https://tenzir.com/docs/reference/operators/to_splunk.md) options:

```tql
splunk::cim::map ocsf, cim
this = move cim
to_splunk "https://splunk.example.com:8088",
  hec_token=secret("splunk-hec-token"),
  time=_time,
  host=host,
  source=source,
  sourcetype=sourcetype
```

The mapper reads one field and writes another, so a pipeline holding an OCSF event at the top level stages it first, then promotes the CIM event before the sink reads top-level metadata:

```tql
this = {ocsf: this}
splunk::cim::map ocsf, cim
this = move cim
to_splunk "https://splunk.example.com:8088",
  hec_token=secret("splunk-hec-token"),
  time=_time,
  host=host,
  source=source,
  sourcetype=sourcetype
```

Use the `index` option when the destination index differs per event.

## See Also

* [`to_splunk`](https://tenzir.com/docs/reference/operators/to_splunk.md)
* [Clean up values](../parse/clean-up-values.md)
* [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-cim-skill)
* [Map to ASIM](map-to-asim.md)
* [Map to ECS](map-to-ecs.md)
* [Map to OCSF](map-to-ocsf.md)
* [Map to UDM](map-to-udm.md)
* [Create a package](../packages/create-a-package.md)
* [Write tests](../testing/write-tests.md)
* [Splunk](../../integrations/splunk.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
