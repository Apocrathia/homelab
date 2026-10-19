---
title: "Google integration"
description: "Connect Google Cloud, Google SecOps, and Google Workspace: stream through Pub/Sub, store in Cloud Storage, read Cloud Logging, write Cloud Monitoring metrics, and ship UDM events to SecOps."
canonical: https://tenzir.com/integrations/google
source: https://tenzir.com/integrations/google.md
section: "Integrations"
---

# Google integration

> Connect Google Cloud, Google SecOps, and Google Workspace: stream through Pub/Sub, store in Cloud Storage, read Cloud Logging, write Cloud Monitoring metrics, and ship UDM events to SecOps.

Tenzir connects the Google services security teams rely on: stream events through [Cloud Pub/Sub](google/cloud-pubsub.md), store and replay them in [Cloud Storage](google/cloud-storage.md), read platform telemetry from [Cloud Logging](google/cloud-logging.md), write metrics to [Cloud Monitoring](google/cloud-monitoring.md), write Iceberg tables to [Cloud Lakehouse](google/cloud-lakehouse.md), and ship UDM events to [Google SecOps](google/secops.md) — all from the same pipeline language.

The [Google package](https://app.tenzir.com/library) additionally provides bidirectional UDM ↔ OCSF mappings for both events and entities, so pipelines can normalize once to OCSF and deliver clean UDM to SecOps.
