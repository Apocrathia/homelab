# Grafana Tempo - Distributed Tracing

This directory contains the deployment configuration for Grafana Tempo, providing distributed tracing capabilities for the cluster.

> **Navigation**: [← Back to Observability README](../README.md)

## Architecture

Tempo is deployed in distributed mode with the following components:

- **Distributor**: Receives traces via OTLP and distributes to ingesters
- **Ingester**: Batches and writes traces to storage
- **Compactor**: Compacts trace blocks for efficient storage
- **Querier**: Queries traces from storage
- **Query Frontend**: Provides query API and caching
- **Metrics Generator**: Generates metrics from trace data
- **Gateway**: Nginx-based gateway for unified API access

## Storage Configuration

Tempo uses external RustFS for object storage:

- **Bucket**: `tempo`
- **Endpoint**: `storage.services.apocrathia.com:9009`

## RustFS Setup

Before deploying Tempo, create the `tempo` bucket, the `tempo-storage` user, and
its bucket-scoped access policy on RustFS. Bucket, user, and policy creation is
manual (admin API); follow the procedure in
[`docs/infrastructure/rustfs-bucket-user-creation.md`](../../../../../docs/infrastructure/rustfs-bucket-user-creation.md).

## 1Password Setup

Create a new item called `tempo-secrets` in your 1Password vault with these fields:

| Field               | Value                                |
| ------------------- | ------------------------------------ |
| `access-key-id`     | `tempo-storage`                      |
| `access-key-secret` | The secret key from the RustFS setup |

The 1Password Connect Operator will automatically create a Kubernetes secret, and Flux will inject these values into the HelmRelease at deployment time.

## Trace Ingestion

Traces are collected via Grafana Alloy acting as an OTLP collector:

- **OTLP gRPC**: `alloy.alloy-system.svc:4317`
- **OTLP HTTP**: `alloy.alloy-system.svc:4318`

Applications send traces to Alloy, which forwards them to Tempo.

## Grafana Integration

The Tempo datasource is automatically configured in Grafana with:

- **Trace-to-Logs**: Links traces to Loki logs
- **Trace-to-Metrics**: Links traces to Prometheus metrics
- **Service Graph**: Visualizes service dependencies
- **Node Graph**: Shows trace topology

## Metrics Generation

Tempo generates metrics from trace data and sends them to Mimir:

- **Endpoint**: `http://mimir-gateway.mimir-system.svc:80/api/v1/push`
- **Labels**: `source=tempo`, `cluster=kubernetes`

This enables service graph visualization and span metrics in Grafana.

## Access

- **Traces API**: `http://tempo-gateway.tempo-system.svc:80`
- **Distributor (OTLP)**: `tempo-distributor.tempo-system.svc:4317`

## Instrumented Applications

- **LiteLLM**: OpenTelemetry traces for LLM API calls

## Security Notes

- RustFS credentials are stored in 1Password and referenced via 1Password Connect
- Flux `valuesFrom` automatically injects credentials into the HelmRelease
- External RustFS is configured with `insecure: true` for HTTP communication
- No sensitive values are stored in the Git repository

## References

- **[Grafana Tempo Documentation](https://grafana.com/docs/tempo/)** - Primary documentation source
- **[OpenTelemetry](https://opentelemetry.io/)** - OTLP protocol specification
