# Observability Stack (LGTM)

This directory contains the deployment configuration for the full LGTM (Loki, Grafana, Tempo, Mimir) observability stack.

> **Navigation**: [← Back to Services README](../README.md)

## Components Deployed

### 1. **Grafana Operator** (`grafana/`)

- **Purpose**: Manage Grafana dashboards and datasources via Kubernetes CRDs
- **Deployment**: Via Grafana Operator Helm chart
- **Features**:
  - Dashboard management through `GrafanaDashboard` CRDs
  - Datasource management through `GrafanaDatasource` CRDs
  - GitOps-friendly dashboard deployment
  - Integration with existing kube-prometheus-stack Grafana instance
- **Note**: The actual Grafana UI is deployed via kube-prometheus-stack in infrastructure

### 2. **Grafana Alloy** (`alloy/`)

- **Purpose**: Parent folder for three Alloy releases, one per subfolder:
  `alloy` (shared collector, `logs/`), `alloy-tetragon` (`tetragon/`),
  `alloy-kube-audit` (`kube-audit/`)
- **Shared collector features**:
  - Kubernetes pod log collection
  - Syslog ingestion (RFC3164/5424) on ports 6514/TCP and 514/UDP
  - CEF log ingestion from UniFi devices on port 1514/TCP
  - OpenTelemetry trace collection (OTLP gRPC/HTTP)
  - Integration with Loki for log storage
- **External Access**: Via shared ingest LoadBalancer IP (`ingest.services.apocrathia.com`)
- **Details**: See [`alloy/README.md`](./alloy/README.md)

### 3. **Loki** (`loki/`)

- **Purpose**: Log aggregation and storage
- **Deployment**: Via Loki Helm chart
- **Features**:
  - Log collection from Kubernetes pods
  - S3-compatible storage (RustFS on the NAS)
  - Grafana integration for log querying
  - Log retention and management
- **Storage**: S3-compatible storage (RustFS on the NAS)

### 4. **Mimir** (`mimir/`)

- **Purpose**: Long-term metrics storage and querying
- **Deployment**: Via Mimir distributed Helm chart
- **Features**:
  - Prometheus-compatible metrics storage
  - Long-term retention and scalability
  - Grafana integration for metrics visualization
  - Multi-tenant support
- **Storage**: S3-compatible storage (RustFS on the NAS)

### 5. **Tempo** (`tempo/`)

- **Purpose**: Distributed tracing backend
- **Deployment**: Via Tempo distributed Helm chart
- **Features**:
  - OTLP trace ingestion (gRPC and HTTP)
  - Trace-to-logs correlation with Loki
  - Trace-to-metrics with Prometheus
  - Service graph and node graph visualization
  - Metrics generation from traces
- **Storage**: S3-compatible storage (RustFS on the NAS)

### 6. **OpenTelemetry Operator** (`otel-operator/`)

- **Purpose**: Manage OpenTelemetry components via Kubernetes CRDs
- **Deployment**: Via OpenTelemetry Operator Helm chart
- **Features**:
  - Auto-instrumentation injection for Python, Java, Node.js, .NET
  - `OpenTelemetryCollector` CRD for deploying collectors
  - `Instrumentation` CRD for language-specific agent configuration
  - Pod/namespace annotation-based opt-in for instrumentation
- **Usage**: Annotate pods with `instrumentation.opentelemetry.io/inject-<language>: "otel-system/<language>"`

### 7. **NetFlow → Tenzir** (removed: goflow2)

- **goflow2 is gone** (SIEM lap C): flow records went to `/dev/null` and the
  Tenzir detection node owns NetFlow natively via its `read_netflow`
  operator behind [`tenzir-ingest-lb`](./tenzir/nodes/core/service-ingest.yaml)
  (`:2055/UDP` on the shared pool IP, Tenzir namespace); UniFi exporters
  keep their `:2055` target.

### 8. **Shared Ingest Pool** (`ingest/`)

- **Purpose**: Shared LoadBalancer IP for external telemetry ingestion
- **IP Address**: `10.100.1.96` (`ingest.services.apocrathia.com`)
- **Services Sharing IP**:
  - Alloy: syslog (514/UDP, 6514/TCP), CEF (1514/TCP)
  - Tenzir NetFlow (2055/UDP; `goflow2` removed)
- **Implementation**: Cilium LB IPAM with `lbipam.cilium.io/sharing-key` annotation

### 9. **Prometheus Extras** (`prometheus/`)

- **Purpose**: Additional Prometheus scrape targets and exporters
- **Components**:
  - SNMP Exporter for network device monitoring (UPS, NAS, switches)
  - etcd ScrapeConfig for Talos cluster metrics

### 10. **Gatus** (`gatus/`) — separate Flux Kustomization

- **Purpose**: In-cluster synthetic uptime checks (complements Uptime Kuma / Uptime Robot)
- **Deployment**: Official `gatus-sidecar` chart via Flux Kustomization `services-gatus`
- **Not** included in `services-observability` (depends on CNPG)
- **Details**: See [`gatus/README.md`](./gatus/README.md)

### 11. **tailscale2otel** (`tailscale2otel/`)

- **Purpose**: Collect Tailscale configuration audit logs (who did what, when)
  and tailnet inventory metrics from the Tailscale API
- **Deployment**: `tailscale2otel` chart (OCI, ghcr.io/rknightion/charts)
- **Features**:
  - Polls the configuration audit log API (available on all plans; this
    tailnet is free-plan, so network flow logs are disabled)
  - Pushes OTLP logs and metrics to the Alloy ingest service (logs → Loki,
    metrics → Mimir)
  - OAuth client credentials from 1Password (`tailscale2otel-secrets` item)
- **Details**: See [`tailscale2otel/README.md`](./tailscale2otel/README.md)

### 12. **kube-audit alloy** (`alloy/kube-audit/`)

- **Purpose**: Tail the kube-apiserver audit log on control planes and
  dual-write it to Loki and the Tenzir detection node
- **Deployment**: Grafana Alloy chart as a dedicated root DaemonSet (the
  audit file is root-only; the shared Alloy runs non-root)
- **Details**: See [`alloy/kube-audit/README.md`](./alloy/kube-audit/README.md)

### 13. **Tenzir** (`tenzir/`)

- **Purpose**: SIEM detection plane — OCSF normalization of kube-apiserver
  audit, tetragon, authentik, fleet, trivy, and NetFlow data, SigmaHQ +
  homelab Sigma rules over the unified OCSF bus (`mapping="auto"`),
  findings in the rustfs OCSF archive after the 15-minute hot window;
  Grafana owns alerting
- **Deployment**: `tenzir-node` chart (OCI, ghcr.io/tenzir/charts), two
  nodes in `tenzir-system`: `tenzir-node-core` (detection plane) and
  `tenzir-node-tetragon` (tetragon flood isolate)
- **Details**: See [`tenzir/README.md`](./tenzir/README.md)

### 14. **tetragon alloy** (`alloy/tetragon/`)

- **Purpose**: Root DaemonSet that tails the tetragon agents' JSON export
  files (0600 root-owned, out of reach of the shared Alloy) and pushes them
  as OTLP/HTTP logs to the Tenzir tetragon node; the pod-logs leg to Loki
  via the tetragon `export-stdout` sidecar is unchanged
- **Details**: See [`alloy/tetragon/README.md`](./alloy/tetragon/README.md)

### 15. **ClickHouse** (`clickhouse/`)

- **Purpose**: OCSF query store for the Tenzir SIEM plane - Altinity
  operator, 1 shard x 3 replicas behind a 3-node ClickHouse Keeper
  ensemble, tiered storage (hot Longhorn PVCs, cold parts in the rustfs
  `tenzir` bucket), TTL with a retention-horizon DELETE cap
- **Deployment**: Altinity `altinity-clickhouse-operator` Helm chart
  (CRDs installed by the chart hook) + `ClickHouseKeeperInstallation` +
  `ClickHouseInstallation` CRs in `clickhouse-system`
- **Details**: See [`clickhouse/README.md`](./clickhouse/README.md); rollout
  plan:
  [`docs/plans/clickhouse-rollout.md`](../../../../docs/plans/clickhouse-rollout.md)

## Architecture

The observability stack integrates with the existing kube-prometheus-stack deployment:

- **kube-prometheus-stack** (deployed in infrastructure) provides:

  - Grafana UI for visualization
  - Prometheus for metrics collection
  - Alertmanager for alerting

- **Observability components** (this folder) provide:

  - Grafana Operator for dashboard/datasource management via CRDs
  - Loki for log aggregation and storage
  - Tempo for distributed tracing
  - Mimir for long-term metrics storage
  - Grafana Alloy for log, metrics, and trace collection
  - OpenTelemetry Operator for auto-instrumentation and collector management

- **Data flow**: All components store data in RustFS (S3-compatible storage on the NAS) and feed into the kube-prometheus-stack Grafana instance for unified visualization.

## Data Flow

1. **Pod Logs**: Kubernetes pods → Grafana Alloy → Loki → RustFS storage → Grafana
2. **Syslog/CEF**: Network devices → Alloy (via ingest LB) → Loki → Grafana
3. **NetFlow/IPFIX**: Network devices → Tenzir `read_netflow` (goflow2 removed)
4. **Traces**: Applications (OTLP) → Grafana Alloy → Tempo → RustFS storage → Grafana
5. **Metrics**: Prometheus → Mimir → RustFS storage → Grafana
6. **Trace Metrics**: Tempo metrics generator → Mimir (service graphs, span metrics)

## Configuration

- **Authentication**: Integrated with Authentik for SSO
- **Storage**: RustFS for S3-compatible object storage
- **Persistence**: Longhorn storage class for local component data
- **Monitoring**: ServiceMonitors for Prometheus integration
- **Security**: RBAC, network policies, and security contexts
- **Log Collection**: Grafana Alloy with pod log discovery and forwarding

## Usage

### Accessing Grafana

- **Internal**: `http://grafana.grafana-system.svc:80`
- **External**: Via Gateway API with Authentik proxy

### Querying Logs

- Use LogQL syntax in Grafana
- Logs are automatically collected by Grafana Alloy from all pods
- Retention policies configured in Loki
- External log ingestion via TCP/UDP routes (syslog support)

### Viewing Metrics

- PromQL queries in Grafana
- Long-term storage in Mimir
- Pre-configured dashboards for cluster monitoring

### Managing Dashboards

- Deploy dashboards via `GrafanaDashboard` CRDs
- Manage datasources via `GrafanaDatasource` CRDs
- GitOps-friendly dashboard versioning and deployment
- Automatic synchronization with kube-prometheus-stack Grafana instance

## Dependencies

- **Infrastructure**: Longhorn storage, RustFS on the NAS
- **Security**: Authentik for authentication
- **Networking**: Gateway API for external access (HTTP, TCP, UDP)
- **Monitoring**: Prometheus stack for component metrics

## Maintenance

- **Updates**: Managed via Renovate bot
- **Scaling**: Horizontal scaling supported for all components
- **Monitoring**: Self-monitoring via ServiceMonitors

## References

- **[Grafana Documentation](https://grafana.com/docs/)** - Dashboards and visualization
- **[Grafana Operator](https://grafana.github.io/grafana-operator/docs/)** - CRD-based management
- **[Loki Documentation](https://grafana.com/docs/loki/)** - Log aggregation
- **[Tempo Documentation](https://grafana.com/docs/tempo/)** - Distributed tracing
- **[Mimir Documentation](https://grafana.com/docs/mimir/)** - Long-term metrics storage
- **[Grafana Alloy](https://grafana.com/docs/alloy/)** - Telemetry collector
- **[OpenTelemetry Operator](https://opentelemetry.io/docs/kubernetes/operator/)** - Auto-instrumentation
