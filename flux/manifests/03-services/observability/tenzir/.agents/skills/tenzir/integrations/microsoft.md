---
title: "Microsoft integration"
description: "Connect Azure, Microsoft 365, and Windows: stream through Event Hubs, store in Blob Storage, ingest into Sentinel, and parse the full Windows telemetry surface."
canonical: https://tenzir.com/integrations/microsoft
source: https://tenzir.com/integrations/microsoft.md
section: "Integrations"
---

# Microsoft integration

> Connect Azure, Microsoft 365, and Windows: stream through Event Hubs, store in Blob Storage, ingest into Sentinel, and parse the full Windows telemetry surface.

Tenzir connects the Microsoft estate end to end: stream events through [Azure Event Hubs](microsoft/azure-event-hubs.md), store and replay them in [Blob Storage](microsoft/azure-blob-storage.md), send telemetry to [Microsoft Sentinel](microsoft/sentinel.md), query and ingest workspace data with [Azure Log Analytics](microsoft/azure-log-analytics.md), and collect signals from [Microsoft 365](microsoft/365.md), [Defender](microsoft/defender.md), [Microsoft Graph](microsoft/graph.md), and [Windows Event Logs](microsoft/windows-event-logs.md), all from the same pipeline language. For Windows telemetry, Tenzir can [act as the collector](microsoft/windows-event-forwarding.md) or [receive events from a Windows Event Collector](microsoft/windows-event-collector.md) through the shipping agent of your choice. Our [EVTX integration](microsoft/evtx.md) opens up forensic investigations.

The [Microsoft package](https://app.tenzir.com/library) is the deepest in the Tenzir Library: 70+ operators that parse and map Windows, Active Directory, Azure, Microsoft 365, and Defender telemetry to OCSF.
