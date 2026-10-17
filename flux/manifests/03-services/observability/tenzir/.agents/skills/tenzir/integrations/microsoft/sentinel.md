---
title: "Microsoft Sentinel integration"
description: "Prepare and route security telemetry for Microsoft's cloud-native SIEM."
canonical: https://tenzir.com/integrations/microsoft/sentinel
source: https://tenzir.com/integrations/microsoft/sentinel.md
section: "Integrations"
---

# Microsoft Sentinel integration

> Prepare and route security telemetry for Microsoft's cloud-native SIEM.

[Microsoft Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/overview) is Microsoft’s cloud-native SIEM. Use Tenzir to parse, filter, enrich, and normalize security telemetry before sending it to a Sentinel-enabled Log Analytics workspace with [`to_azure_log_analytics`](https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md).

Our [Azure Log Analytics](azure-log-analytics.md) integration covers workspace setup, authentication, permissions, and DCE/DCR ingestion routing. Sentinel uses the same workspace transport, not a separate Tenzir connector.

## ASIM mapping

Microsoft Sentinel uses the Advanced Security Information Model (ASIM) to query normalized security data across products. Use [Map to ASIM](../../guides/normalize/map-to-asim.md) to shape parsed events into ASIM records before you send them to Log Analytics tables.

For agent-assisted work, follow [Use agent skills](../../guides/ai-workbench/use-agent-skills.md#use-the-asim-skill) to use the `tenzir-asim` skill. The skill helps choose ASIM schemas, inspect fields, resolve aliases, and map source telemetry with canonical field names such as `EventSchema`, `SrcIpAddr`, and `DstIpAddr`.

## Send Suricata alerts as OCSF

Forward Suricata alerts as OCSF Detection Findings to a custom workspace table. Configure Sentinel queries and detections for that table and schema; ingestion does not automatically map OCSF records to ASIM.

```tql
from_file "/var/log/suricata/eve.json", follow=true
where event_type == "alert"
suricata::ocsf::map
to_azure_log_analytics \
  tenant_id="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  client_id="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  client_secret="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  dce="https://my-dce.westeurope-1.ingest.monitor.azure.com",
  dcr="dcr-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  stream="OCSF_DetectionFinding_CL"
```

## Query security telemetry

Use the experimental [`from_azure_log_analytics`](https://tenzir.com/docs/reference/operators/from_azure_log_analytics.md) operator to retrieve security events from the workspace for enrichment, investigation, or export. Follow our [workspace query example](azure-log-analytics.md#query-a-workspace) for read permissions and a bounded KQL query. Ingestion permissions do not grant query access.

For native Defender advanced hunting, use [`from_microsoft_defender`](https://tenzir.com/docs/reference/operators/from_microsoft_defender.md). For Microsoft Entra and Microsoft 365 data exposed through Graph, use our [Microsoft Graph](graph.md) integration.

## See also

* [Azure Log Analytics](azure-log-analytics.md)
* [Map to ASIM](../../guides/normalize/map-to-asim.md)
* [Microsoft Defender](defender.md)
