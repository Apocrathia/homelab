---
title: "to_azure_log_analytics"
canonical: https://tenzir.com/docs/reference/operators/to_azure_log_analytics
source: https://tenzir.com/docs/reference/operators/to_azure_log_analytics.md
section: "Docs"
---

# to_azure_log_analytics

> Sends events to the Microsoft Azure Logs Ingestion API.

Sends events to the Microsoft Azure Logs Ingestion API.

```tql
to_azure_log_analytics tenant_id=string, client_id=string, client_secret=string,
      dce=string, dcr=string, stream=string, [batch_timeout=duration,
      parallel=int]
```

## Description

Sends events to the Microsoft [Azure Logs Ingestion API](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview). To query data already stored in a workspace, use the experimental [`from_azure_log_analytics`](https://tenzir.com/docs/reference/operators/from_azure_log_analytics.md) operator instead. Querying requires workspace read permissions, not the DCR permissions used for ingestion.

The `to_azure_log_analytics` operator makes it possible to upload events to [supported tables](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview#supported-tables) or to [custom tables](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/create-custom-table?tabs=azure-portal-1%2Cazure-portal-2%2Cazure-portal-3#create-a-custom-table) in Microsoft Azure.

The operator handles access token retrievals by itself and updates that token automatically, if needed.

### `tenant_id = string`

The Microsoft Directory (tenant) ID, written as `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

### `client_id = string`

The Microsoft Application (client) ID, written as `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

### `client_secret = string`

The client secret.

### `dce = string`

The data collection endpoint URL.

### `dcr = string`

The data collection rule ID, written as `dcr-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

### `stream = string`

The stream to upload events to.

### `batch_timeout = duration`

Maximum duration to wait for new events before sending a batch.

Defaults to `5s`.

### `parallel = int (optional)`

The maximum number of concurrent requests per operator instance. Values greater than `1` let the operator send the next batch before the API responded to the previous one, at the cost of the API no longer receiving batches in the order the operator produced them. Set `parallel=1` to send one request at a time.

Defaults to `8`. Must be at least `1`.

## Parallelism

In a [parallel pipeline](../../guides/node-setup/tune-performance.md#parallelism), each instance of `to_azure_log_analytics` accumulates its own batches and sends them with its own access token and connection. Because `parallel` bounds the requests in flight within one instance, the pipeline-wide bound is `parallel` times the number of instances.

The Logs Ingestion API accepts every request on its own and gives no ordering guarantee across requests, so the table never reflects a strict pipeline order once more than one request is in flight.

## Examples

### Upload `custom.mydata` events to the stream `Custom-MyData`

```tql
export
where @name == "custom.mydata"
to_azure_log_analytics tenant_id="00a00a00-0a00-0a00-00aa-000aa0a0a000",
  client_id="000a00a0-0aa0-00a0-0000-00a000a000a0",
  client_secret="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  dce="https://my-stuff-a0a0.westeurope-1.ingest.monitor.azure.com",
  dcr="dcr-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  stream="Custom-MyData"
```

## See Also

* [Map to ASIM](../../guides/normalize/map-to-asim.md)
* [Azure Log Analytics](../../integrations/microsoft/azure-log-analytics.md)

Parallelizable: a parallel pipeline may run this operator on several cores at once.
