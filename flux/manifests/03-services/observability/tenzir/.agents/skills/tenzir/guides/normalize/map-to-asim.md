---
title: "Map to ASIM"
canonical: https://tenzir.com/docs/guides/normalize/map-to-asim
source: https://tenzir.com/docs/guides/normalize/map-to-asim.md
section: "Docs"
---

# Map to ASIM

> This guide shows you how to map events to Microsoft Sentinel Advanced Security Information Model (ASIM) records in TQL. You’ll learn how to choose an ASIM schema, populate schema and product metadata, map role-prefixed fields, normalize event results, and preserve unmapped source fields.

This guide shows you how to map events to Microsoft Sentinel Advanced Security Information Model (ASIM) records in TQL. You’ll learn how to choose an ASIM schema, populate schema and product metadata, map role-prefixed fields, normalize event results, and preserve unmapped source fields.

## Use the ASIM skill

Install the `tenzir-asim` skill when you want an agent to help with ASIM schema decisions. See [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-asim-skill) for installation and usage examples.

Ask the agent to choose the event or entity schema before it maps fields. ASIM fields use Microsoft Sentinel column names such as `EventSchema`, `EventSchemaVersion`, `SrcIpAddr`, and `DstIpAddr`. Prefer canonical fields over aliases when you build reusable mappings, analytics rules, or workbooks.

## Choose the ASIM schema

Start by choosing `EventSchema` and `EventSchemaVersion` for event records, or `EntitySchema` and `EntitySchemaVersion` for entity records. These fields identify the schema contract that the record follows.

For a firewall connection event, choose the `NetworkSession` schema. It describes IP network activity from sources such as firewalls, NetFlow records, routers, operating systems, and intrusion prevention systems.

For a `NetworkSession` event, start with these core fields:

* `EventSchema`: The schema name. Use `NetworkSession`.
* `EventSchemaVersion`: The schema version. Use `0.2.7` for `NetworkSession`.
* `EventType`: The activity scenario, such as `NetworkSession`, `Flow`, or `EndpointNetworkSession`.
* `EventVendor` and `EventProduct`: The source product context.
* `EventStartTime` and `EventEndTime`: The activity time range.
* `EventResult`: The normalized result, such as `Success` or `Failure`.
* `Src*` and `Dst*`: The source and destination participants.

## Apply ASIM rules

Mappings live in packages as operators. Our tutorial on [onboarding a data source](../../tutorials/onboard-a-data-source.md) builds one from a log line to an installable package, and the same workflow applies here because only the target fields differ.

These rules are specific to ASIM:

* **Set the schema fields early**: Let `EventSchema` and `EventSchemaVersion` drive which field records, constants, and conditional requirements you apply.
* **Map participants with role prefixes**: Use prefixes such as `Src`, `Dst`, `Actor`, `Target`, `Acting`, and `Dvc` to distinguish entities in the event.
* **Populate by field class**: Start with `Mandatory` fields, add useful `Recommended` fields, and populate `Conditional` fields when their documented condition applies.
* **Normalize enum values explicitly**: Map source strings to ASIM values such as `Allow`, `Deny`, `Success`, `Failure`, `TCP`, or `UDP`.
* **Prefer canonical fields**: Resolve aliases to canonical ASIM fields before you build reusable mappings or detections.
* **Preserve unmapped fields**: Keep source fields that don’t have a deliberate ASIM target in `AdditionalFields` so reviewers can audit the mapping.

## See Also

* [`to_azure_log_analytics`](https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md)
* [Clean up values](../parse/clean-up-values.md)
* [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-asim-skill)
* [Map to CIM](map-to-cim.md)
* [Map to ECS](map-to-ecs.md)
* [Map to OCSF](map-to-ocsf.md)
* [Map to UDM](map-to-udm.md)
* [Create a package](../packages/create-a-package.md)
* [Write tests](../testing/write-tests.md)
* [Microsoft Sentinel](../../integrations/microsoft/sentinel.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
