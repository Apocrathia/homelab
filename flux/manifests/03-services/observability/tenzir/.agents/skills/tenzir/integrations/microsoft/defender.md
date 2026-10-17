---
title: "Microsoft Defender integration"
description: "Detect, prevent, and respond to security threats across endpoints and networks."
canonical: https://tenzir.com/integrations/microsoft/defender
source: https://tenzir.com/integrations/microsoft/defender.md
section: "Integrations"
---

# Microsoft Defender integration

> Detect, prevent, and respond to security threats across endpoints and networks.

[Microsoft Defender](https://learn.microsoft.com/en-us/defender-xdr/microsoft-365-defender-portal) offers protection, detection, investigation, and response to threats. Defender comes in multiple editions, [Defender for Office 365](https://learn.microsoft.com/en-us/defender-office-365/mdo-about), [Defender for Endpoint](https://learn.microsoft.com/en-us/defender-endpoint/), [Defender for IoT](https://learn.microsoft.com/en-us/defender-for-iot/microsoft-defender-iot), [Defender for Identity](https://learn.microsoft.com/en-us/defender-for-identity/what-is), and [Defender for Cloud](https://learn.microsoft.com/en-us/defender-xdr/microsoft-365-security-center-defender-cloud). All Defender products can stream events in real time to Tenzir using [Azure Event Hubs](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about).

Microsoft Defender

For Microsoft Defender and Microsoft 365 data that is exposed as Microsoft Graph collections, use [Microsoft Graph](graph.md) with [`from_microsoft_graph`](https://tenzir.com/docs/reference/operators/from_microsoft_graph.md). Use Azure Event Hubs for real-time Defender streaming. For the Microsoft API surface, see the [Microsoft Graph Security API reference](https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview) and the [Microsoft Defender XDR API reference](https://learn.microsoft.com/en-us/defender-xdr/api-overview).

Microsoft Defender Setup

The following example assumes that you have already set up Microsoft Defender and Microsoft Defender XDR, for example, by following the [official documentation](https://learn.microsoft.com/en-us/azure/defender-for-cloud/connect-azure-subscription).

## Run an advanced hunting query

Use [`from_microsoft_defender`](https://tenzir.com/docs/reference/operators/from_microsoft_defender.md) to run arbitrary KQL against native Defender advanced hunting data and receive typed rows. Register an Entra application, grant the Microsoft Graph application permission `ThreatHunting.Read.All`, and grant administrator consent. Your tenant also needs the product licenses and table access required by the query.

```tql
from_microsoft_defender "DeviceProcessEvents | project Timestamp, DeviceName, FileName | take 100",
  azure_auth={
    tenant_id: secret("AZURE_TENANT_ID"),
    client_id: secret("AZURE_CLIENT_ID"),
    client_secret: secret("AZURE_CLIENT_SECRET"),
  }
```

Native Defender hunting doesn’t require a Sentinel workspace. Defender data copied into Log Analytics and data exposed through connected Sentinel workspaces are distinct from native Defender hunting data. This operator doesn’t expose workspace selection or implement a Sentinel integration.

The source runs once and doesn’t maintain a cursor. Restarting it reruns the query. With no `start` and `end`, the Graph service currently defaults to a 30-day lookback, subject to table, retention, licensing, and tenant constraints. Specify both arguments to send a bounded `Timespan`; KQL time predicates still apply. A successful request doesn’t guarantee complete extraction. For continuous telemetry collection, consider Event Hubs streaming instead.

## Setup

### Configure Streaming API

In Microsoft Security Center, configure Streaming under `System -> Settings -> Microsoft Defender XDR -> General -> Streaming API`. Add a new Streaming API for the target Event Hub and enable all event types that you want to collect.

For detailed instructions on setting up Azure Event Hubs and consuming events with Tenzir, see the [Azure Event Hubs integration documentation](azure-event-hubs.md).

## See Also

* [`from_microsoft_graph`](https://tenzir.com/docs/reference/operators/from_microsoft_graph.md)
* [Microsoft Graph](graph.md)
* [Azure Event Hubs](azure-event-hubs.md)
