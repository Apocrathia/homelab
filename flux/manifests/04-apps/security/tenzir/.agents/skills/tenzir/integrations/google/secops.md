---
title: "Google SecOps integration"
description: "Send events to Google SecOps"
canonical: https://tenzir.com/integrations/google/secops
source: https://tenzir.com/integrations/google/secops.md
section: "Integrations"
---

# Google SecOps integration

> Send events to Google SecOps

[Google Security Operations (SecOps)](https://cloud.google.com/security/products/security-operations) is Google’s security operations platform. Tenzir can send raw logs, UDM events, and entity records to Google SecOps. Raw logs can use either the Ingestion API or the Chronicle Import API. UDM events and entities use the Import API.

Google Security Operations

## UDM mapping

Google SecOps stores normalized security data in the Unified Data Model (UDM). Use [Map to UDM](../../guides/normalize/map-to-udm.md) to shape parsed events into API-facing UDM records.

For agent-assisted work, follow [Use agent skills](../../guides/ai-workbench/use-agent-skills.md#use-the-udm-skill) to use the `tenzir-udm` skill. The skill helps map logs into UDM API ingestion payloads with names such as `metadata.eventType`, and write YARA-L or rule field paths with names such as `metadata.event_type`.

Tenzir’s [`to_google_secops`](https://tenzir.com/docs/reference/operators/to_google_secops.md) operator can send raw logs, UDM events, and entities. Use `mode="udm_event"` after shaping events into SecOps UDM records. The operator forwards UDM and entity rows as-is, so build them with the ingestion field names before sending them.

## Authentication

Authentication depends on the selected API:

* With `api="ingestion"`, provide `private_key`, `client_email`, and `customer_id` as secrets. The `region` is optional.
* With `api="import"`, identify the SecOps instance with `project`, `region`, and `instance`. Provide service-account JSON with `service_credentials`, or omit it to use Google Application Default Credentials.

## Examples

### Forward raw logs without parsing timestamps

Choose `api="ingestion"` when Google SecOps should parse the timestamp from the raw log. The `log_entry_time` option remains optional on this path:

```tql
from {log: "31-Mar-2025 01:35:02.187 client 0.0.0.0#4238: query: tenzir.com IN A + (255.255.255.255)"}
to_google_secops \
  api="ingestion",
  private_key=secret("my_secops_private_key"),
  client_email=secret("my_secops_client_email"),
  customer_id=secret("my_secops_customer_id"),
  log_text=log,
  log_type="BIND_DNS",
  labels={env: "prod"}
```

### Send raw logs with the Import API

```tql
from {log: "31-Mar-2025 01:35:02.187 client 0.0.0.0#4238: query: tenzir.com IN A + (255.255.255.255)"}
to_google_secops \
  mode="raw_log",
  project="my-project",
  region="us",
  instance="my-secops-instance",
  service_credentials=secret("my_secops_service_account"),
  log_text=log,
  log_type="BIND_DNS",
  log_entry_time=2026-01-01T00:00:00,
  collection_time=2026-01-01T00:00:01,
  labels={tenant: {value: "acme", rbac_enabled: true}},
  forwarder="forwarder-1",
  hint="bind-dns",
  source_filename="named.log"
```

### Send UDM events

```tql
from {
  metadata: {
    eventTimestamp: 2026-01-01T00:00:00,
    collectedTimestamp: 2026-01-01T00:00:01,
    eventType: "NETWORK_CONNECTION",
    vendorName: "Tenzir",
    productName: "Tenzir Pipeline",
    productVersion: "dev",
    productEventType: "connection",
    productLogId: "tenzir-udm-001",
    description: "Network connection observed by Tenzir",
  },
  principal: {
    hostname: "host.example",
    ip: ["192.0.2.10"],
    user: {
      userid: "alice",
      emailAddresses: ["alice@example.com"],
    },
  },
  target: {
    hostname: "service.example",
    ip: ["198.51.100.20"],
    port: 443,
  },
  network: {
    applicationProtocol: "HTTPS",
    ipProtocol: "TCP",
    sentBytes: 1250,
    receivedBytes: 4096,
  },
  securityResult: [{
    action: ["ALLOW"],
    severity: "LOW",
  }],
  additional: {
    fields: {
      sourcePipeline: {stringValue: "to_google_secops-example"},
      marker: {stringValue: "tenzir-udm-rich"},
    },
  },
}
to_google_secops \
  mode="udm_event",
  project="my-project",
  region="us",
  instance="my-secops-instance",
  service_credentials=secret("my_secops_service_account")
```

### Send entities

```tql
from {
  metadata: {
    collectedTimestamp: 2026-01-01T00:00:01,
    vendorName: "Tenzir",
    productName: "Tenzir Pipeline",
    entityType: "USER",
  },
  entity: {
    user: {
      userid: "alice@example.com",
      productObjectId: "alice-0001",
      userDisplayName: "Alice Example",
      emailAddresses: ["alice@example.com", "alice@corp.example"],
      employeeId: "E0001",
      title: "Security Analyst",
      companyName: "Example Corp",
      department: "Security Operations",
    },
  },
  additional: {
    fields: {
      sourcePipeline: {stringValue: "to_google_secops-example"},
      marker: {stringValue: "tenzir-entity-rich"},
    },
  },
}
to_google_secops \
  mode="udm_entity",
  project="my-project",
  region="us",
  instance="my-secops-instance",
  service_credentials=secret("my_secops_service_account"),
  log_type="AZURE_AD_CONTEXT"
```
