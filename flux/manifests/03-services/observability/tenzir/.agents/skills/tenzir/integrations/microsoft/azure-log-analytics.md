---
title: "Azure Log Analytics integration"
description: "Query workspace data and send events to Azure Monitor Logs with Tenzir."
canonical: https://tenzir.com/integrations/microsoft/azure-log-analytics
source: https://tenzir.com/integrations/microsoft/azure-log-analytics.md
section: "Integrations"
---

# Azure Log Analytics integration

> Query workspace data and send events to Azure Monitor Logs with Tenzir.

Azure Log Analytics lets you query log data stored in Azure Monitor Log Analytics workspaces. Use the experimental [`from_azure_log_analytics`](https://tenzir.com/docs/reference/operators/from_azure_log_analytics.md) operator to read KQL query results and [`to_azure_log_analytics`](https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md) to send events through the Logs Ingestion API.

For security analytics and ASIM normalization, use our [Microsoft Sentinel](sentinel.md) integration. Both operators work with Log Analytics workspaces; neither requires a dedicated Sentinel API.

## Workspace ingestion

Workspace ingestion architecture

To get data into a workspace, Azure uses two components:

1. A [Data Collection Endpoint (DCE)](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-endpoint-overview) receives your data via HTTPS. This is the URL Tenzir sends events to.
2. A [Data Collection Rule (DCR)](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-overview) transforms incoming data and routes it to a specific table in your workspace.

This separation lets you send all data to one DCE while routing different streams to different tables, or even different cost tiers, by configuring multiple DCRs.

## Ingestion prerequisites

Before sending events to Log Analytics, set up the following in the Azure Portal. The [Logs Ingestion API overview](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview), [Data Collection Endpoint (DCE) overview](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-endpoint-overview), and [Data Collection Rule (DCR) overview](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-overview) explain how these Azure resources work together.

1. **Log Analytics Workspace**: [Create a workspace](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/quick-create-workspace) if you don’t have one.
2. **Entra ID Application**: [Register an app](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) to get your `tenant_id`, `client_id`, and `client_secret` for authentication.
3. **Data Collection Endpoint**: [Create a DCE](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-endpoint-overview#create-a-data-collection-endpoint) in your region to get the ingestion URL.
4. **Custom Table**: [Create a table](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/create-custom-table) in your workspace to receive the data (e.g., `MyLogs_CL`).
5. **Data Collection Rule**: [Create a DCR](https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-create-edit) that routes data from your DCE to your table.
6. **Permissions**: Grant your Entra app the **Monitoring Metrics Publisher** role on the DCR.

End-to-End Tutorial

Microsoft’s [Logs Ingestion API tutorial](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/tutorial-logs-ingestion-portal) walks through all these steps with screenshots.

## Query a workspace

Use the experimental [`from_azure_log_analytics`](https://tenzir.com/docs/reference/operators/from_azure_log_analytics.md) operator to execute a finite KQL query against a workspace. Register an Entra application and grant it workspace query access, for example with the **Log Analytics Reader** role. You need the workspace GUID, not a DCE, DCR, or ingestion stream. DCR ingestion permissions don’t grant read access.

```tql
from_azure_log_analytics "SecurityEvent | project TimeGenerated, Computer, EventID",
  workspace_id=secret("azure-workspace-id"),
  azure_auth={
    tenant_id: secret("azure-tenant-id"),
    client_id: secret("azure-client-id"),
    client_secret: secret("azure-client-secret"),
  },
  start=2026-01-01,
  end=2026-01-02
```

The operator emits typed rows without the API envelope or automatic normalization. It fails on service-reported partial results and doesn’t paginate or poll continuously. Keep queries bounded by time range and output size. For native Defender advanced hunting rather than workspace data, use [`from_microsoft_defender`](https://tenzir.com/docs/reference/operators/from_microsoft_defender.md).

## Table plans

Choose a [table plan](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-platform-logs#table-plans) based on your query, retention, and cost requirements. Analytics, Basic, and Auxiliary tables have different capabilities and restrictions. Check the plan’s query API support before using the source operator; it does not switch to the search API for plans that require it.

## See also

* [Microsoft Sentinel](sentinel.md)
* [Microsoft Graph](graph.md)
