---
title: "Overview"
description: "Map source-specific events into a shared schema."
canonical: https://tenzir.com/docs/guides/normalize
source: https://tenzir.com/docs/guides/normalize.md
section: "Docs"
---

# Overview

> Map source-specific events into a shared schema.

These guides take you from source-specific events to a schema your downstream tools understand. We map sources to OCSF first and translate from there, and our explanation of [normalization](../explanations/normalization.md) makes the case for why.

## Choose a target schema

Pick the schema your analytics platform reads. The guides are listed alphabetically, and each one covers the decisions its schema adds.

[Map to ASIM](normalize/map-to-asim.md) maps to Microsoft Sentinel ASIM: choose the event or entity schema, populate schema and product metadata, map the role-prefixed field families, and keep the residue in `AdditionalFields`.

[Map to CIM](normalize/map-to-cim.md) maps to Splunk CIM: choose the data model and dataset, apply tags and constraints so acceleration works, and send the result to HEC with the right metadata.

[Map to ECS](normalize/map-to-ecs.md) maps to Elastic Common Schema: set `@timestamp` and `ecs.version`, choose the `event.*` categorization, map the source, destination, network, and observer fieldsets, and keep source-specific details in a custom namespace.

[Map to OCSF](normalize/map-to-ocsf.md) maps to OCSF, our default target: identify the event class, map by attribute group, handle unmapped fields, and validate with `ocsf_cast`.

[Map to UDM](normalize/map-to-udm.md) maps to Google SecOps UDM: choose the event type, populate metadata and participant nouns, convert values to UDM enums, and keep the residue in `additional`.

## Ship the mapping

A mapping that lives in a package gets a test, a version, and one place to fix a field. [Onboard a data source](../tutorials/onboard-a-data-source.md) builds one from a single log line and ships it as an installable package.

## See also

* [Parse string fields](parse/parse-string-fields.md)
* [Create a package](packages/create-a-package.md)
* [Write tests](testing/write-tests.md)
* [Normalization](../explanations/normalization.md)
