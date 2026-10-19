---
title: "Map to UDM"
canonical: https://tenzir.com/docs/guides/normalize/map-to-udm
source: https://tenzir.com/docs/guides/normalize/map-to-udm.md
section: "Docs"
---

# Map to UDM

> This guide shows you how to map events to Google SecOps Unified Data Model (UDM) records in TQL. You’ll learn how to choose a UDM event type, populate metadata, model participants as UDM nouns, convert enum values, and preserve unmapped source fields.

This guide shows you how to map events to Google SecOps Unified Data Model (UDM) records in TQL. You’ll learn how to choose a UDM event type, populate metadata, model participants as UDM nouns, convert enum values, and preserve unmapped source fields.

Send structured UDM records

Tenzir’s [`to_google_secops`](https://tenzir.com/docs/reference/operators/to_google_secops.md) operator can send structured UDM records to Google SecOps. Use `mode="udm_event"` for UDM event rows, or `mode="udm_entity"` for UDM entity rows.

The TQL examples in this guide build API-facing UDM records, so they use lowerCamelCase ingestion object field names such as `metadata.eventType` and `network.ipProtocol`.

## Use the UDM skill

Install the `tenzir-udm` skill when you want an agent to help with UDM schema decisions. See [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-udm-skill) for installation and usage examples.

Ask the agent to use ingestion object field names when it maps logs into UDM event or entity objects for Google SecOps UDM API ingestion. When generated UDM field headings show two forms, choose the right-side lowerCamelCase ingestion object form. For example, use `metadata.eventType` and `network.ipProtocol` in the TQL output. If a heading has one name, use that spelling.

## Choose the UDM event type

Start by choosing `metadata.eventType`. This value describes the activity that the event records, not the product that emitted the log. For example, a firewall connection log maps to `NETWORK_CONNECTION`, while DNS payloads map to `NETWORK_DNS`.

For a `NETWORK_CONNECTION` event, UDM expects these core sections:

* `metadata`: The event timestamp and product context.
* `principal`: The machine that initiated the network connection.
* `target`: The destination machine if it differs from the principal.
* `network`: The protocol, ports, byte counts, and other connection details.

## Apply UDM rules

Mappings live in packages as operators. Our tutorial on [onboarding a data source](../../tutorials/onboard-a-data-source.md) builds one from a log line to an installable package, and the same workflow applies here because only the target fields differ.

These rules are specific to UDM:

* **Set `metadata.eventType` early**: Let the UDM event type drive which participant nouns and protocol fields you populate.
* **Model participants as nouns**: Use `principal` for the initiating entity, `target` for the destination, `observer` for the sensor, and `intermediary` for proxies or middleboxes.
* **Convert enum values explicitly**: Map source strings to UDM enum names such as `TCP`, `UDP`, `ALLOW`, or `BLOCK`.
* **Preserve unmapped fields**: Keep source fields that don’t have a deliberate UDM target under `additional` so reviewers can audit the mapping.

## See Also

* [`to_google_secops`](https://tenzir.com/docs/reference/operators/to_google_secops.md)
* [Clean up values](../parse/clean-up-values.md)
* [Use agent skills](../ai-workbench/use-agent-skills.md#use-the-udm-skill)
* [Map to ASIM](map-to-asim.md)
* [Map to CIM](map-to-cim.md)
* [Map to ECS](map-to-ecs.md)
* [Map to OCSF](map-to-ocsf.md)
* [Create a package](../packages/create-a-package.md)
* [Write tests](../testing/write-tests.md)
* [Onboard a data source](../../tutorials/onboard-a-data-source.md)
