---
title: "to_google_secops"
canonical: https://tenzir.com/docs/reference/operators/to_google_secops
source: https://tenzir.com/docs/reference/operators/to_google_secops.md
section: "Docs"
---

# to_google_secops

> Sends raw logs, UDM events, or entities to a Google SecOps Chronicle instance.

Sends raw logs, UDM events, or entities to a Google SecOps Chronicle instance.

```tql
to_google_secops [mode=string, api=string, project=string, region=string,
                 instance=string, service_credentials=secret,
                 private_key=secret, client_email=secret, customer_id=secret,
                 log_type=string, log_text=blob|string, log_entry_time=time,
                 collection_time=time, labels=record, forwarder=string,
                 hint=string, source_filename=string, namespace=string,
                 max_request_size=int, max_batch_events=int,
                 batch_timeout=duration, parallel=int]
```

## Description

The `to_google_secops` operator supports two Google SecOps API families:

* `api="import"` sends raw logs to the [`logs.import` API](https://cloud.google.com/chronicle/docs/reference/rest/v1/projects.locations.instances.logTypes.logs/import). This is the default.
* `api="ingestion"` sends raw logs to the [`UnstructuredLogEntries` Ingestion API](https://cloud.google.com/chronicle/docs/reference/ingestion-api#unstructuredlogentries). This API can derive the event timestamp from the raw log when `log_entry_time` is omitted.

The `mode` selects the payload type:

* `mode="raw_log"` supports both `api="import"` and `api="ingestion"`.
* `mode="udm_event"` sends each input row as a UDM event to the [`events.import` API](https://cloud.google.com/chronicle/docs/reference/rest/v1/projects.locations.instances.events/import) and requires `api="import"`.
* `mode="udm_entity"` sends each input row as an entity to the [`entities.import` API](https://cloud.google.com/chronicle/docs/reference/rest/v1/projects.locations.instances.entities/import) and requires `api="import"`.

### `mode = string`

Selects the ingestion mode. Must be `raw_log`, `udm_event`, or `udm_entity`.

Defaults to `raw_log`.

### `api = string`

Selects the Google SecOps API. Must be `import` or `ingestion`.

Defaults to `import`.

The `ingestion` value is only valid with `mode="raw_log"`.

### `project = string`

The Google Cloud project that owns the SecOps instance. Required with `api="import"` and invalid with `api="ingestion"`.

### `region = string`

The SecOps location. This also selects the regional API host. Required with `api="import"` and optional with `api="ingestion"`. The Ingestion API uses its unprefixed US endpoint when this option is omitted or set to `us`.

### `instance = string`

The SecOps instance ID. Required with `api="import"` and invalid with `api="ingestion"`.

### `service_credentials = secret (optional)`

Full service-account JSON to use for Google Cloud OAuth2 authentication. Use a secret value for credentials in production.

When omitted, the operator uses Google Application Default Credentials.

Only valid with `api="import"`.

### `private_key = secret`

The PEM-encoded service-account private key. Required with `api="ingestion"`.

### `client_email = secret`

The service-account email address. Required with `api="ingestion"`.

### `customer_id = secret`

The Google SecOps customer ID. Required with `api="ingestion"`.

### `log_type = string`

The raw log type or entity log type. Required when `mode="raw_log"` or `mode="udm_entity"`.

For raw logs, this selects the SecOps parser. With `api="import"`, it also selects the log type in the `logs.import` resource path. For entities, this sets the `logType` field in the `entities.import` request. Use a context source log type accepted by your SecOps instance, such as `AZURE_AD_CONTEXT` for Azure AD user context. This is not the same as the UDM entity type, such as `USER` or `ASSET`.

### UDM and entity field names

UDM events and entities are sent as Import API JSON. Shape these rows with Google’s lowerCamelCase ingestion field names, such as `metadata.eventType` and `metadata.entityType`. Query field names in SecOps search and YARA-L often use snake\_case, such as `metadata.event_type`; those are not the field names to send to the import APIs. The operator forwards each UDM or entity row as-is and does not translate field names.

### `log_text = blob|string`

The raw log text. String values must contain valid UTF-8.

With `api="import"`, the value may be a blob or string and is base64-encoded before it is sent. With `api="ingestion"`, the value must be a string and is sent as the original raw log.

Required when `mode="raw_log"`.

### `log_entry_time = time`

The timestamp of the raw log entry. Required with `api="import"`.

With `api="ingestion"`, this option is optional. The operator sends it as microseconds since the Unix epoch. When omitted, the raw log must contain a timestamp for Google SecOps to derive.

### `collection_time = time`

The time at which the raw log entry was collected. Google requires this to be after `log_entry_time`. Required with `api="import"` and invalid with `api="ingestion"`.

### `labels = record (optional)`

A record of custom metadata labels to attach to raw logs.

String values default to `rbacEnabled=false`. To allow a label to be used for Google SecOps Data RBAC, use the structured form:

```tql
labels={
  env: "prod",
  tenant: {value: "acme", rbac_enabled: true},
}
```

This structured form is available with `api="import"`. With `api="ingestion"`, every label value must be a string.

Only valid when `mode="raw_log"`.

### `forwarder = string (optional)`

The SecOps forwarder name to attach to raw logs.

Only valid when `mode="raw_log"` and `api="import"`.

### `hint = string (optional)`

The parser hint to pass to the `logs.import` API.

Only valid when `mode="raw_log"` and `api="import"`.

### `source_filename = string (optional)`

The source filename to attach to raw logs.

Only valid when `mode="raw_log"` and `api="import"`.

### `namespace = string (optional)`

The environment namespace for raw logs.

Only valid when `mode="raw_log"`.

With `api="ingestion"`, this defaults to `tenzir`.

### `max_request_size = int (optional)`

The maximum number of bytes in the uncompressed request payload.

With `api="import"`, this defaults to `2M` and must be between `100k` and `4M`. With `api="ingestion"`, this defaults to `1M` and must be between `100k` and `1M`.

### `max_batch_events = int (optional)`

The maximum number of events to include in one request.

Defaults to `1k`. Must be at least `1`.

### `batch_timeout = duration (optional)`

The maximum duration to wait for new events before sending the request.

Defaults to `5s`.

### `parallel = int (optional)`

The maximum number of concurrent requests per operator instance. Set `parallel=1` to send one request at a time.

Defaults to `8`. Must be at least `1`.

### Parallelism

When you enable [parallelism](../../guides/node-setup/tune-performance.md#parallelism), Tenzir can run `to_google_secops` on several cores at once. Because `parallel` bounds the requests in flight within one instance, the pipeline-wide bound is `parallel` times the number of instances.

## Examples

### Forward raw logs without parsing timestamps

Use `api="ingestion"` to let Google SecOps extract the event timestamp from the raw log:

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

Add `log_entry_time` when the pipeline already has the timestamp. Otherwise, omit it and let Google SecOps derive it.

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

## See Also

* [`to_google_cloud_logging`](https://tenzir.com/docs/reference/operators/to_google_cloud_logging.md)
* [Map to UDM](../../guides/normalize/map-to-udm.md)
* [Google SecOps](../../integrations/google/secops.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
